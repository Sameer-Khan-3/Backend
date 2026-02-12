import { Request, Response, NextFunction } from "express";
import { MockAuthService } from "../services/auth/MockAuthService";

const authService = new MockAuthService();

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization;

  if (!token || !(await authService.verify(token))) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
}
