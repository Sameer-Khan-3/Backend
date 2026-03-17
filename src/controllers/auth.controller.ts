import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthService } from "../services/auth.service";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/role";

const authService = new AuthService();
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || "us-east-1",
});

const signUpSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.string().trim().optional().default(""),
    username: z.string().trim().min(1, "Username is required"),
    gender: z.string().trim().min(1, "Gender is required"),
    formattedName: z.string().trim().min(1).optional(),
  })
  .strict();

const signInSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

const resetPasswordDirectSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  })
  .strict();

export async function signUp(req: Request, res: Response) {
  try {
    console.log("Signup request received:", req.body);

    const parsed = signUpSchema.safeParse(req.body);

    if (!parsed.success) {
      console.log("Validation failed:", parsed.error.flatten().fieldErrors);
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password, role, username, gender, formattedName } = parsed.data;
    const nextRole = role?.trim() || "Employee";
    console.log("Parsed data:", { email, username, gender, formattedName, role: nextRole });

    const userRepo = AppDataSource.getRepository(User);

    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      console.log("User already exists in DB:", email);
      return res.status(409).json({ message: "User already exists" });
    }

    const userPoolId = process.env.COGNITO_USER_POOL_ID;

    if (!userPoolId) {
      console.error("COGNITO_USER_POOL_ID is missing in env");
      return res
        .status(500)
        .json({ message: "Cognito user pool not configured" });
    }

    console.log("Creating user in Cognito...");

    const createUserResponse = await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "gender", Value: gender },
          { Name: "name", Value: formattedName || username },
        ],
        TemporaryPassword: password,
        MessageAction: "SUPPRESS",
      })
    );

    console.log("Cognito AdminCreateUser success:", createUserResponse);

    console.log("Setting permanent password in Cognito...");

    const passwordResponse = await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      })
    );

    console.log("Cognito password set success:", passwordResponse);

    console.log("Calling authService.signUp...");

    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: email,
        GroupName: nextRole,
      })
    );

    const data = await authService.signUp(email, password, username, nextRole);

    

    return res.status(201).json(data);

  } catch (error: any) {
    console.error("Signup error:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Signup failed",
      error: error.message,
    });
  }
}

export async function signIn(req: Request, res: Response) {
  try {
    const parsed = signInSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { email, password } = parsed.data;
    const data = await authService.signIn(email, password);
    res.status(200).json(data);
  } catch (error: any) {
    if (error.message === "PASSWORD_CHANGE_REQUIRED") {
      return res.status(403).json({
        message: "Password change required",
        mustChangePassword: true,
      });
    }

    return res.status(401).json({ message: error.message });
  }
}

export const resetPasswordDirect = async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordDirectSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, newPassword } = parsed.data;

    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Update DB password
    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;

    await userRepository.save(user);

    // Sync with Cognito
    await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: email,
        Password: newPassword,
        Permanent: true,
      })
    );

    return res.status(200).json({
      message: "Password updated successfully (synced with Cognito)",
    });

  } catch (error: any) {
    console.error("Direct Reset Password Error:", error);

    return res.status(500).json({
      message: error.message || "Server error",
    });
  }
};
