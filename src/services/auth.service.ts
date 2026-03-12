import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/role";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userRepo = AppDataSource.getRepository(User);
const roleRepo = AppDataSource.getRepository(Role);

export class AuthService {
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
      role: defaultRole,
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
      relations: ["role"],
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
        role: user.role?.name ?? null,
      },
      token,
    };
  }

  private generateToken(user: User) {
    return jwt.sign(
      {
        id: user.id,
        role: user.role?.name?.toUpperCase() || null,
        roles: user.role?.name ? [user.role.name.toUpperCase()] : [],
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );
  }
}
