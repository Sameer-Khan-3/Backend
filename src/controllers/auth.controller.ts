import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

export const login = (req: Request, res: Response) => {
  const { email, password } = req.body;

  // TEMP dummy validation
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  // 🔥 THIS IS IMPORTANT
  const token = jwt.sign(
    { email },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  return res.status(200).json({
    message: "User logged in",
    token: token
  });
};
