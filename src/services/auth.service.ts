import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";


import { UserService } from "./user.service";

const userService = new UserService();

export class AuthService {
  async login(email: string, password: string) {
    const user = await userService.findByEmail(email);

    if (!user || user.status !== "ACTIVE") {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new Error("Invalid credentials");
    }

    const JWT_SECRET = process.env.JWT_SECRET as string;

    const options: SignOptions = {
      expiresIn: process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"] || "1h",
    };

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      JWT_SECRET,
      options
    );
  }
}
