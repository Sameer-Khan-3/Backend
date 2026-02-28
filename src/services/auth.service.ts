import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { PasswordResetToken } from "../entities/PasswordResetToken";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userRepo = AppDataSource.getRepository(User);
const tokenRepo = AppDataSource.getRepository(PasswordResetToken);

export class AuthService {

  
  async signUp(email: string, password: string, role: string, username: string) {
    const existing = await userRepo.findOne({
      where: [{ email }, { username }],
    });

    if (existing) throw new Error("User already exists");

    const hashed = await bcrypt.hash(password, 10);

    const user = userRepo.create({
      email,
      password: hashed,
      role,
      username,
    });

    await userRepo.save(user);

    const token = this.generateToken(user);

    return { user, token };
  }

  async signIn(email: string, password: string) {
    const user = await userRepo.findOne({
    where: { email },
    select: ["id", "email", "password", "role", "username"]
      });
    if (!user) throw new Error("Invalid credentials");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid credentials");

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username
      },
      token
    };
  }

  // ================= FORGOT PASSWORD =================
  async forgotPassword(email: string) {
    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new Error("User not found");

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const token = tokenRepo.create({
      token: code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      user,
    });

    await tokenRepo.save(token);

    // TODO: Send email here

    return { message: "Verification code sent" };
  }

  // ================= RESET PASSWORD =================
  async resetPassword(code: string, newPassword: string) {
    const record = await tokenRepo.findOne({
      where: { token: code },
      relations: ["user"],
    });

    if (!record || record.expiresAt < new Date())
      throw new Error("Invalid or expired code");

    const hashed = await bcrypt.hash(newPassword, 10);

    record.user.password = hashed;
    await userRepo.save(record.user);

    await tokenRepo.remove(record);

    return { message: "Password updated" };
  }

  // ================= FORGOT USERNAME =================
  async forgotUsername(email: string) {
    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new Error("User not found");

    // TODO: Send email with username

    return { message: `Username sent to ${email}` };
  }

  private generateToken(user: User) {
    return jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );
  }
}