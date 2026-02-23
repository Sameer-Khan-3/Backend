import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import crypto from "crypto";

export const forgetPassword = async (req: Request, res: Response) => {
  try {
    const {email} = req.body;

    if(!email) {
      return res.status(400).json({message: "Email is required"});
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({where: {email}});

    if(!user) {
      return res.status(404).json({message: "User not found"});
    }
    const resetToken = crypto.randomBytes(32).toString("hex");

    const expiry = new Date(Date.now()+3600000); // 1 hour
    
    user.resetToken = resetToken;
    user.resetTokenExpiry = expiry;

    await userRepository.save(user)

    return res.status(200).json({message: "Password reset token generated", resetToken});
  }
  catch (error) {
  console.error("Forgot Password Error:", error);
  return res.status(500).json({
    message: "Server error",
    error: error instanceof Error ? error.message : error
  });
}
    }