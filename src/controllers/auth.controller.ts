import { Request, Response } from "express";
import { MockAuthService } from "../services/auth/MockAuthService";

const authService = new MockAuthService();

export class AuthController {

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const token = await authService.login(email, password);

    return res.json({ token });
  }
}
