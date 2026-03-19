import { Request, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { UserService } from "../services/user.service";
import {
  deleteCognitoUser,
  getCognitoUserIdentity,
  setCognitoUserRole,
} from "../services/cognito.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { Role } from "../entities/role";
import { Roles } from "../utils/roles.enum";
import { resolveRequestRole } from "../utils/role.utils";

const userService = new UserService();

const signUpSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email format"),
    username: z.string().trim().min(1, "Username is required"),
    gender: z.string().trim().min(1, "Gender is required").optional(),
    formattedName: z.string().trim().min(1).optional(),
  })
  .strict();

const extractAuthDisplayName = (req: AuthRequest) => {
  const candidates = [
    req.user?.name,
    req.user?.given_name,
    req.user?.preferred_username,
    req.user?.email,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "User";
};

const buildUniqueUsername = async (
  desiredUsername: string,
  ignoreUserId?: string
) => {
  const userRepo = AppDataSource.getRepository(User);
  const trimmed = desiredUsername.trim() || "User";
  let candidate = trimmed;
  let suffix = 1;

  while (true) {
    const existing = await userRepo.findOne({
      where: { username: candidate },
    });

    if (!existing || existing.id === ignoreUserId) {
      return candidate;
    }

    suffix += 1;
    candidate = `${trimmed} ${suffix}`;
  }
};

export async function syncProfile(req: AuthRequest, res: Response) {
  try {
    const email =
      typeof req.user?.email === "string" ? req.user.email.trim().toLowerCase() : "";
    const cognitoSub =
      typeof req.user?.sub === "string" ? req.user.sub.trim() : "";
    const cognitoUsername =
      typeof req.user?.["cognito:username"] === "string"
        ? req.user["cognito:username"].trim()
        : email;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const roleName = resolveRequestRole(req);

    const roleEntity = await roleRepo.findOne({
      where: { name: roleName },
    });

    if (!roleEntity) {
      return res.status(500).json({ message: "Role configuration is missing" });
    }

    let user =
      (cognitoSub
        ? await userRepo.findOne({
            where: { cognitoSub },
            relations: ["role", "department"],
          })
        : null) ||
      (await userRepo.findOne({
        where: [{ email }, { cognitoUsername: cognitoUsername || email }],
        relations: ["role", "department"],
      }));

    const nextDisplayName = extractAuthDisplayName(req);

    if (!user) {
      const username = await buildUniqueUsername(nextDisplayName);
      user = await userService.create({
        email,
        username,
        cognitoUsername: cognitoUsername || email,
        cognitoSub: cognitoSub || null,
      });
      user = await userRepo.findOne({
        where: { id: user.id },
        relations: ["role", "department"],
      });
    }

    if (!user) {
      return res.status(500).json({ message: "Failed to sync user profile" });
    }

    const nextUsername = await buildUniqueUsername(nextDisplayName, user.id);
    user.email = email;
    user.username = nextUsername;
    user.cognitoUsername = cognitoUsername || email;
    user.cognitoSub = cognitoSub || user.cognitoSub;
    user.role = roleEntity;

    await userRepo.save(user);

    const syncedUser = await userRepo.findOne({
      where: { id: user.id },
      relations: ["role", "department"],
    });

    return res.status(200).json(syncedUser);
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message || "Failed to sync user profile",
    });
  }
}

export async function signUp(req: Request, res: Response) {
  try {
    const parsed = signUpSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, username } = parsed.data;
    const userRepo = AppDataSource.getRepository(User);

    const cognitoUser = await getCognitoUserIdentity(email);
    if (!cognitoUser.cognitoUsername) {
      return res.status(400).json({
        message: "Cognito user lookup failed",
      });
    }

    if (cognitoUser.status !== "CONFIRMED") {
      return res.status(400).json({
        message: "Verify your email before creating the profile",
      });
    }

    const existingUser = await userRepo.findOne({
      where: { email },
      relations: ["role", "department"],
    });

    await setCognitoUserRole(
      cognitoUser.cognitoUsername,
      existingUser?.role?.name || Roles.Employee
    );

    if (existingUser) {
      return res.status(200).json({
        message: "Signup profile already exists",
        user: existingUser,
      });
    }

    try {
      const user = await userService.create({
        email,
        username,
        cognitoUsername: cognitoUser.cognitoUsername,
        cognitoSub: cognitoUser.cognitoSub,
      });

      return res.status(201).json({
        message: "Signup successful",
        user,
      });
    } catch (error) {
      await deleteCognitoUser(cognitoUser.cognitoUsername).catch(() => undefined);
      throw error;
    }
  } catch (error: any) {
    return res.status(400).json({
      message: error?.message || "Signup failed",
    });
  }
}
