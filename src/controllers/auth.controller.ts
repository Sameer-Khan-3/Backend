import { Request, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { UserService } from "../services/user.service";
import {
  deleteCognitoUser,
  getCognitoUser,
} from "../services/cognito.service";

const userService = new UserService();

const signUpSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email format"),
    username: z.string().trim().min(1, "Username is required"),
    gender: z.string().trim().min(1, "Gender is required"),
    formattedName: z.string().trim().min(1).optional(),
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

    const { email, username } = parsed.data;
    const userRepo = AppDataSource.getRepository(User);

    const existingUser = await userRepo.findOne({
      where: { email },
      relations: ["role", "department"],
    });

    if (existingUser) {
      return res.status(200).json({
        message: "Signup profile already exists",
        user: existingUser,
      });
    }

    const cognitoUser = await getCognitoUser(email);
    if (cognitoUser.UserStatus !== "CONFIRMED") {
      return res.status(400).json({
        message: "Verify your email before creating the profile",
      });
    }

    try {
      const user = await userService.create({
        email,
        username,
      });

      return res.status(201).json({
        message: "Signup successful",
        user,
      });
    } catch (error) {
      await deleteCognitoUser(email).catch(() => undefined);
      throw error;
    }
  } catch (error: any) {
    return res.status(400).json({
      message: error?.message || "Signup failed",
    });
  }
}
