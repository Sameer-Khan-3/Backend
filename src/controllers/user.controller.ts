import { Request, Response } from "express";
import { z } from "zod";
import { UserService } from "../services/user.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/role";
import { Department } from "../entities/Department";
import {
  createCognitoUser,
  deleteCognitoUser,
  getCognitoUserIdentity,
  listCognitoUsers,
  setCognitoUserEnabled,
  updateCognitoUserProfile,
  setCognitoUserRole,
} from "../services/cognito.service";
import { Roles } from "../utils/roles.enum";
import { normalizeRole, resolveRequestRole } from "../utils/role.utils";

const service = new UserService();

const createUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  email: z.string().email("Invalid email format"),
});

const updateUserSchema = z.object({
  username: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  role: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  departmentId: z.union([z.string().trim().min(1), z.literal(""), z.null()]).optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1, "Invalid id"),
});

const COGNITO_ID_PREFIX = "cognito:";

const extractCognitoUsernameFromId = (id: string) => {
  if (!id.startsWith(COGNITO_ID_PREFIX)) {
    return null;
  }

  const cognitoUsername = id.slice(COGNITO_ID_PREFIX.length).trim();
  return cognitoUsername || null;
};

const findUserByIdOrCognitoIdentity = async (
  id: string,
  userRepo: ReturnType<typeof AppDataSource.getRepository<User>>
) => {
  const cognitoUsernameFromId = extractCognitoUsernameFromId(id);

  if (!cognitoUsernameFromId) {
    return {
      user: await userRepo.findOne({
        where: { id },
        relations: ["role", "department"],
      }),
      cognitoUsernameFromId: null,
    };
  }

  const user = await userRepo.findOne({
    where: [
      { id },
      { cognitoUsername: cognitoUsernameFromId },
      { email: cognitoUsernameFromId },
    ],
    relations: ["role", "department"],
  });

  return {
    user,
    cognitoUsernameFromId,
  };
};

const isCognitoUserMissingError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "UserNotFoundException" ||
    error.message.toLowerCase().includes("usernotfoundexception")
  );
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const resolveCurrentUser = async (req: AuthRequest) => {
  const userRepo = AppDataSource.getRepository(User);
  const currentUserSub = req.user?.sub;
  const currentUserId = req.user?.id;
  const currentUserEmail = req.user?.email || null;

  if (!currentUserSub && !currentUserId && !currentUserEmail) {
    return null;
  }

  return userRepo.findOne({
    where: [
      currentUserSub ? { cognitoSub: currentUserSub } : undefined,
      currentUserEmail ? { email: currentUserEmail } : undefined,
      currentUserId ? { id: currentUserId } : undefined,
    ].filter(Boolean) as Array<{ cognitoSub?: string; id?: string; email?: string }>,
    relations: ["role", "department"],
  });
};

export async function createUser(req: Request, res: Response) {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { username, email } = parsed.data;
    await createCognitoUser(email, "Employee", {
      formattedName: username,
      suppressMessage: false,
    });
    const cognitoUser = await getCognitoUserIdentity(email);

    let user: User;
    try {
      user = await service.create({
        username,
        email,
        cognitoUsername: cognitoUser.cognitoUsername,
        cognitoSub: cognitoUser.cognitoSub,
      });
    } catch (error) {
      await deleteCognitoUser(cognitoUser.cognitoUsername).catch(() => undefined);
      throw error;
    }

    res.status(201).json({
      ...user,
      message:
        "User created successfully. A temporary password has been sent to the user's email. They can sign in and set a new password.",
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create user",
      error: error.message,
    });
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const departmentRepo = AppDataSource.getRepository(Department);
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { id } = parsed.data;
    const cognitoUsernameFromId = extractCognitoUsernameFromId(id);

    const user = await userRepo.findOne({
      where: cognitoUsernameFromId
        ? [
            { id },
            { cognitoUsername: cognitoUsernameFromId },
            { email: cognitoUsernameFromId },
          ]
        : { id },
    });

    if (!user && !cognitoUsernameFromId) {
      return res.status(404).json({ message: "User not found" });
    }

    const managedDepartments = user
      ? await departmentRepo.find({
          where: { manager: { id: user.id } },
          relations: ["manager"],
        })
      : [];

    const cognitoUsernameToDelete =
      user?.cognitoUsername || user?.email || cognitoUsernameFromId;

    if (cognitoUsernameToDelete) {
      try {
        await deleteCognitoUser(cognitoUsernameToDelete);
      } catch (error) {
        if (!isCognitoUserMissingError(error)) {
          throw error;
        }
      }
    }

    if (user) {
      await AppDataSource.transaction(async (transactionManager) => {
        if (managedDepartments.length > 0) {
          for (const department of managedDepartments) {
            department.manager = null as any;
            await transactionManager.save(Department, department);
          }
        }

        await transactionManager.remove(User, user);
      });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete user";
    res.status(500).json({ message });
  }
};

export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const role = resolveRequestRole(req);
    const isAdmin = role?.toLowerCase() === "admin";

    if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const requesterId = req.user?.id ?? null;
    const requesterEmail = req.user?.email ?? null;

    const rawSearch =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const search = rawSearch.toLowerCase();

    const userRepo = AppDataSource.getRepository(User);
    const [dbUsers, cognitoUsers] = await Promise.all([
      userRepo.find({
        relations: ["role", "department"],
      }),
      listCognitoUsers(),
    ]);

    const dbUsersById = new Map(dbUsers.map((user) => [user.id, user]));
    const dbUsersByEmail = new Map(
      dbUsers
        .filter((user) => Boolean(user.email))
        .map((user) => [user.email.toLowerCase(), user])
    );
    const dbUsersByCognitoSub = new Map(
      dbUsers
        .filter((user) => Boolean(user.cognitoSub))
        .map((user) => [user.cognitoSub as string, user])
    );
    const dbUsersByCognitoUsername = new Map(
      dbUsers
        .filter((user) => Boolean(user.cognitoUsername))
        .map((user) => [user.cognitoUsername as string, user])
    );

    const matchedDbUserIds = new Set<string>();

    const mergedUsers = cognitoUsers.map((cognitoUser) => {
      const matchedDbUser =
        (cognitoUser.cognitoSub &&
          dbUsersByCognitoSub.get(cognitoUser.cognitoSub)) ||
        (cognitoUser.email &&
          dbUsersByEmail.get(cognitoUser.email.toLowerCase())) ||
        dbUsersByCognitoUsername.get(cognitoUser.cognitoUsername) ||
        null;

      if (matchedDbUser) {
        matchedDbUserIds.add(matchedDbUser.id);
      }

      return {
        id: matchedDbUser?.id || `cognito:${cognitoUser.cognitoUsername}`,
        localUserId: matchedDbUser?.id || null,
        hasLocalProfile: Boolean(matchedDbUser),
        cognitoUsername: cognitoUser.cognitoUsername,
        cognitoSub: cognitoUser.cognitoSub,
        username: matchedDbUser?.username || cognitoUser.username,
        email: matchedDbUser?.email || cognitoUser.email || cognitoUser.cognitoUsername,
        role:
          matchedDbUser?.role ||
          (cognitoUser.role ? { name: cognitoUser.role } : null),
        isActive:
          typeof matchedDbUser?.isActive === "boolean"
            ? matchedDbUser.isActive
            : cognitoUser.enabled,
        department: matchedDbUser?.department || null,
        createdAt: matchedDbUser?.createdAt?.toISOString?.() || cognitoUser.createdAt,
        updatedAt: matchedDbUser?.updatedAt?.toISOString?.() || cognitoUser.updatedAt,
        cognitoStatus: cognitoUser.status,
      };
    });

    const localOnlyUsers = dbUsers
      .filter((user) => !matchedDbUserIds.has(user.id))
      .map((user) => ({
        id: user.id,
        localUserId: user.id,
        hasLocalProfile: true,
        cognitoUsername: user.cognitoUsername,
        cognitoSub: user.cognitoSub,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        department: user.department,
        createdAt: user.createdAt?.toISOString?.(),
        updatedAt: user.updatedAt?.toISOString?.(),
        cognitoStatus: null,
      }));

    const users = [...mergedUsers, ...localOnlyUsers]
      .filter((user) => {
        if (requesterEmail && user.email === requesterEmail) {
          return false;
        }

        if (!requesterEmail && requesterId && user.localUserId === requesterId) {
          return false;
        }

        if (!search) {
          return true;
        }

        const searchable = [
          user.username,
          user.email,
          typeof user.role === "string" ? user.role : user.role?.name,
          user.department?.name,
          user.cognitoStatus,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ")
          .toLowerCase();

        return searchable.includes(search);
      })
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });

    res.json(users);

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response) {
  try {
    const currentUser = await resolveCurrentUser(req);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(currentUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch user" });
  }
}

export const getUsersByDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const currentUser = await resolveCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!currentUser?.department?.id) {
      return res.status(400).json({ message: "User is not assigned to any department" });
    }

    const rawSearch =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const rawName =
      typeof req.query.name === "string" ? req.query.name.trim() : "";
    const rawEmail =
      typeof req.query.email === "string" ? req.query.email.trim() : "";

    const search = rawSearch.toLowerCase();
    const name = rawName.toLowerCase();
    const email = rawEmail.toLowerCase();

    const query = userRepo
      .createQueryBuilder("user")
      .innerJoinAndSelect("user.department", "department")
      .leftJoinAndSelect("user.role", "role")
      .where("department.id = :departmentId", {
        departmentId: currentUser.department.id,
      });

    if (search) {
      query.andWhere(
        "(LOWER(user.username) LIKE :search OR LOWER(user.email) LIKE :search)",
        { search: `%${search}%` }
      );
    }

    if (name) {
      query.andWhere("LOWER(user.username) LIKE :name", {
        name: `%${name}%`,
      });
    }

    if (email) {
      query.andWhere("LOWER(user.email) LIKE :email", {
        email: `%${email}%`,
      });
    }

    const users = await query.getMany();

    res.json(users);
  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch department users",
    });
  }
};

export async function getUser(req: AuthRequest, res: Response) {
  try {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const requestedUserId = parsed.data.id;

    const role = resolveRequestRole(req);
    const isAdmin = role?.toLowerCase() === "admin";
    const user = await service.findOne(requestedUserId);

    const requesterSub = req.user?.sub;
    const requesterEmail = req.user?.email || null;
    const isSelf =
      (requesterSub && user.cognitoSub === requesterSub) ||
      (requesterEmail && user.email === requesterEmail) ||
      req.user?.id === requestedUserId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(user);

  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
}

export const updateUser = async (req: Request, res: Response) => {
  try {
    const paramsParsed = idParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: paramsParsed.error.flatten().fieldErrors,
      });
    }
    const bodyParsed = updateUserSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: bodyParsed.error.flatten().fieldErrors,
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const departmentRepo = AppDataSource.getRepository(Department);

    const { username, email, role, isActive, departmentId } = bodyParsed.data;
    const { user: existingUser, cognitoUsernameFromId } =
      await findUserByIdOrCognitoIdentity(paramsParsed.data.id, userRepo);

    let user = existingUser;

    if (!user && cognitoUsernameFromId) {
      const cognitoUser = await getCognitoUserIdentity(cognitoUsernameFromId);
      const nextUsername = username?.trim() || cognitoUser.email || cognitoUsernameFromId;

      user = await service.create({
        username: nextUsername,
        email: cognitoUser.email || cognitoUsernameFromId,
        cognitoUsername: cognitoUser.cognitoUsername,
        cognitoSub: cognitoUser.cognitoSub,
      });

      user = await userRepo.findOne({
        where: { id: user.id },
        relations: ["role", "department"],
      });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const previousUsername = user.username;
    const previousEmail = user.email;
    const previousIsActive = user.isActive;
    const previousRoleName = user.role?.name ?? null;
    let nextCognitoRole: Roles | null = null;
    let cognitoIdentifier = user.cognitoUsername?.trim() || null;

    if (!cognitoIdentifier && user.email) {
      try {
        const cognitoIdentity = await getCognitoUserIdentity(user.email);
        cognitoIdentifier = cognitoIdentity.cognitoUsername;
        user.cognitoUsername = cognitoIdentity.cognitoUsername;
        user.cognitoSub = cognitoIdentity.cognitoSub;
      } catch (error) {
        if (!isCognitoUserMissingError(error)) {
          throw error;
        }
      }
    }

    // update fields
    if (typeof username === "string") {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        return res.status(400).json({ message: "Username is required" });
      }

      const existingUsernameUser = await userRepo.findOne({
        where: { username: trimmedUsername },
      });

      if (existingUsernameUser && existingUsernameUser.id !== user.id) {
        return res.status(400).json({ message: "Username already exists" });
      }

      user.username = trimmedUsername;
    }
    if (typeof email === "string") {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ message: "Email is required" });
      }

      const existingEmailUser = await userRepo.findOne({
        where: { email: normalizedEmail },
      });

      if (existingEmailUser && existingEmailUser.id !== user.id) {
        return res.status(400).json({ message: "Email already exists" });
      }

      user.email = normalizedEmail;
    }
    if (typeof isActive === "boolean") user.isActive = isActive;

    // update role
    if (typeof role === "string" && role.trim()) {
      const normalizedRole = normalizeRole(role);
      if (!normalizedRole) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const roleEntity = await roleRepo
        .createQueryBuilder("role")
        .where("LOWER(role.name) = :normalizedRole", {
          normalizedRole: normalizedRole.toLowerCase(),
        })
        .getOne();

      if (roleEntity) {
        user.role = roleEntity;
        nextCognitoRole = normalizedRole;
      }
    }

    const isManagerAfterUpdate =
      user.role?.name?.toLowerCase() === "manager";

    let nextDepartmentId: string | null | undefined =
      user.department?.id ?? null;

    if (departmentId !== undefined) {
      if (departmentId === null || departmentId === "") {
        user.department = null as any;
        nextDepartmentId = null;
      } else {
        if (typeof departmentId !== "string" || !departmentId.trim()) {
          return res.status(400).json({ message: "Invalid departmentId" });
        }

        const department = await departmentRepo.findOne({
          where: { id: departmentId },
        });

        if (!department) {
          return res.status(404).json({ message: "Department not found" });
        }

        user.department = department;
        nextDepartmentId = department.id;
      }
    }

    if (departmentId === null || departmentId === "") {
      const managedDepartment = await departmentRepo.findOne({
        where: { manager: { id: user.id } },
        relations: ["manager"],
      });

      if (managedDepartment) {
        managedDepartment.manager = null as any;
        await departmentRepo.save(managedDepartment);
      }
    }

    if (isManagerAfterUpdate && nextDepartmentId) {
      const existingManager = await userRepo
        .createQueryBuilder("u")
        .leftJoin("u.role", "role")
        .where("role.name = :roleName", { roleName: "Manager" })
        .andWhere("u.departmentId = :departmentId", {
          departmentId: nextDepartmentId,
        })
        .andWhere("u.id != :userId", { userId: user.id })
        .getOne();

      if (existingManager) {
        return res
          .status(400)
          .json({ message: "Department already has a manager" });
      }

      const existingManagerDept = await departmentRepo.findOne({
        where: { manager: { id: user.id } },
        relations: ["manager"],
      });

      if (existingManagerDept && existingManagerDept.id !== nextDepartmentId) {
        return res
          .status(400)
          .json({ message: "Manager is already assigned to another department" });
      }

      const targetDepartment = await departmentRepo.findOne({
        where: { id: nextDepartmentId },
        relations: ["manager"],
      });

      if (!targetDepartment) {
        return res.status(404).json({ message: "Department not found" });
      }

      if (
        targetDepartment.manager &&
        targetDepartment.manager.id !== user.id
      ) {
        return res
          .status(400)
          .json({ message: "Department already has a manager" });
      }

      targetDepartment.manager = user;
      await departmentRepo.save(targetDepartment);
    }

    if (!isManagerAfterUpdate) {
      const managedDepartment = await departmentRepo.findOne({
        where: { manager: { id: user.id } },
        relations: ["manager"],
      });

      if (managedDepartment) {
        managedDepartment.manager = null as any;
        await departmentRepo.save(managedDepartment);
      }
    }

    const shouldSyncCognitoRole =
      !!cognitoIdentifier &&
      !!nextCognitoRole &&
      nextCognitoRole !== normalizeRole(previousRoleName);
    const shouldSyncCognitoProfile =
      !!cognitoIdentifier &&
      (user.username !== previousUsername || user.email !== previousEmail);
    const shouldSyncCognitoStatus =
      !!cognitoIdentifier && user.isActive !== previousIsActive;

    if (shouldSyncCognitoProfile && cognitoIdentifier) {
      await updateCognitoUserProfile(cognitoIdentifier, {
        email: user.email,
        name: user.username,
      });
    }

    if (shouldSyncCognitoStatus && cognitoIdentifier) {
      await setCognitoUserEnabled(cognitoIdentifier, user.isActive);
    }

    if (shouldSyncCognitoRole && nextCognitoRole && cognitoIdentifier) {
      await setCognitoUserRole(cognitoIdentifier, nextCognitoRole);
    }

    try {
      await userRepo.save(user);
    } catch (error) {
      if (shouldSyncCognitoRole && previousRoleName && cognitoIdentifier) {
        await setCognitoUserRole(cognitoIdentifier, previousRoleName).catch(
          () => undefined
        );
      }
      if (shouldSyncCognitoStatus && cognitoIdentifier) {
        await setCognitoUserEnabled(cognitoIdentifier, previousIsActive).catch(
          () => undefined
        );
      }
      if (shouldSyncCognitoProfile && cognitoIdentifier) {
        await updateCognitoUserProfile(cognitoIdentifier, {
          email: previousEmail,
          name: previousUsername,
        }).catch(() => undefined);
      }
      throw error;
    }

    const updatedUser = await userRepo.findOne({
      where: { id: user.id },
      relations: ["role", "department"],
    });

    res.json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error, "Update failed") });
  }
};
