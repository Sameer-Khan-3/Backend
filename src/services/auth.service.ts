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
    username: string,
    roleName = "Employee"
  ) {
    const existing = await userRepo.findOne({
      where: [{ email }, { username }],
    });

    if (existing) {
      throw new Error("User already exists");
    }

    const role = await roleRepo.findOne({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error("Default role not found. Seed roles first.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = userRepo.create({
      email,
      username,
      password: hashedPassword,
      role,
      mustChangePassword: false,
    });

    await userRepo.save(user);

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role?.name ?? null,
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
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );
  }
}
