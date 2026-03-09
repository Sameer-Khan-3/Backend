import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AuthService } from "../services/auth.service";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";

const authService = new AuthService();

export async function signUp(req: Request, res: Response) {
  try {
    const { email, password, role, username } = req.body;

    const data = await authService.signUp(email, password, role, username);
    res.status(201).json(data);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function signIn(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
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
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email and new password required" });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;

    await userRepository.save(user);
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Direct Reset Password Error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};
