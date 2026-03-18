import { Request, Response } from "express";
import { z } from "zod";
import { UserService } from "../services/user.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/role";
import { Department } from "../entities/Department";


const service = new UserService();

const createUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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

const resolveRequestRole = (req: AuthRequest): string | null => {
  if (typeof req.user?.role === "string") {
    return req.user.role;
  }

  if (Array.isArray(req.user?.["cognito:groups"])) {
    return req.user["cognito:groups"][0];
  }
  return null;
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
    const { username, email, password } = parsed.data;
    // If valid -> create user
    const user = await service.create({ username, email, password });

    res.status(201).json(user);
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
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { id } = parsed.data;

    const user = await userRepo.findOne({ where: { id } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await userRepo.remove(user);

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const role = resolveRequestRole(req);
    const isAdmin = role?.toLowerCase() === "admin";

    if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const requesterId = req.user?.id ?? null;

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
      .leftJoinAndSelect("user.role", "role")
      .leftJoinAndSelect("user.department", "department");

    if (requesterId) {
      query.andWhere("user.id != :requesterId", { requesterId });
    }

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

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export const getUsersByDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const currentUserId = req.user?.id;
    const currentUserEmail = req.user?.email || null;
    const currentUserName =
      req.user?.username || req.user?.["cognito:username"] || null;
    if (!currentUserId && !currentUserEmail && !currentUserName) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUser = await userRepo.findOne({
      where: [
        currentUserId ? { id: currentUserId } : undefined,
        currentUserEmail ? { email: currentUserEmail } : undefined,
      ].filter(Boolean) as Array<{ id?: string; email?: string }>,
      relations: ["department"],
    });

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

    const isSelf = req.user?.id === requestedUserId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await service.findOne(requestedUserId);
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

    const user = await userRepo.findOne({
      where: { id: paramsParsed.data.id },
      relations: ["role", "department"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // update fields
    if (typeof username === "string") user.username = username;
    if (typeof email === "string") user.email = email;
    if (typeof isActive === "boolean") user.isActive = isActive;

    // update role
    if (typeof role === "string" && role.trim()) {
      const normalizedRole = role.trim().toLowerCase();
      const roleEntity = await roleRepo
        .createQueryBuilder("role")
        .where("LOWER(role.name) = :normalizedRole", { normalizedRole })
        .getOne();

      if (roleEntity) {
        user.role = roleEntity;
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

    await userRepo.save(user);

    const updatedUser = await userRepo.findOne({
      where: { id: user.id },
      relations: ["role", "department"],
    });

    res.json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};
