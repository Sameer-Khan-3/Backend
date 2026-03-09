import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IAuthService } from "../interfaces/IAuthService";

const userRepo = AppDataSource.getRepository(User);
const roleRepo = AppDataSource.getRepository(Role);

export class AuthService implements IAuthService {
  async signUp(
    email: string,
    password: string,
    _role: string,
    username: string
  ) {
    const existing = await userRepo.findOne({ where: { email } });
    if (existing) throw new Error("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultRole = await roleRepo.findOne({
      where: { name: "Employee" },
    });

    if (!defaultRole) {
      throw new Error("Default role not found. Seed roles first.");
    }

    const user = userRepo.create({
      email,
      password: hashedPassword,
      roles: [defaultRole],
      username,
    });

    await userRepo.save(user);
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    };
  }

  async signIn(email: string, password: string) {
    const user = await userRepo.findOne({
      where: { email },
      relations: ["roles"],
    });

    if (!user) throw new Error("Invalid credentials");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid credentials");

    if (user.mustChangePassword) {
      throw new Error("PASSWORD_CHANGE_REQUIRED");
    }

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles.map((r) => r.name),
      },
      token,
    };
  }

  private generateToken(user: User) {
    return jwt.sign(
      {
        id: user.id,
        roles: user.roles?.map((r) => r.name.toUpperCase()) || [],
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );
  }
}
