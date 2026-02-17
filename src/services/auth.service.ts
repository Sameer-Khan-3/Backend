import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt.config";
import { User } from "../models/user.model";

const mockUser: User = {
  id: "1",
  firstName: "Admin",
  lastName: "User",
  email: "admin@test.com",
  password: bcrypt.hashSync("password123", 10),
  status: "ACTIVE",
};

export class AuthService {
  async login(email: string, password: string) {
    if (email !== mockUser.email || mockUser.status !== "ACTIVE") {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, mockUser.password);

    if (!valid) {
      throw new Error("Invalid credentials");
    }

    return jwt.sign(
      {
        id: mockUser.id,
        email: mockUser.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
}
