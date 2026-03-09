import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import bcrypt from "bcrypt";
import { Roles } from "../utils/roles.enum";

const userRepo = AppDataSource.getRepository(User);
const roleRepo = AppDataSource.getRepository(Role);

export class UserService {
  async create(data: Partial<User>) {
    const existing = await userRepo.findOne({
      where: [{ email: data.email }, { username: data.username }],
    });

    if (existing) {
      throw new Error("User already exists");
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const employeeRole = await roleRepo.findOne({
      where: { name: Roles.Employee },
    });

    if (!employeeRole) {
      throw new Error("Default role not found. Seed roles first.");
    }

    const user = userRepo.create({
      ...data,
      roles: [employeeRole],
    });

    return userRepo.save(user);
  }

  async findAll() {
    return userRepo.find({
      relations: ["roles", "department"],
    });
  }

  async findOne(id: string) {
    const user = await userRepo.findOne({
      where: { id },
      relations: ["roles", "department"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async update(id: string, data: Partial<User>) {
    const user = await this.findOne(id);

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    userRepo.merge(user, data);
    return userRepo.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await userRepo.remove(user);
    return { message: "User deleted successfully" };
  }

  async assignRole(userId: string, roleName: string) {
    const user = await userRepo.findOne({
      where: { id: userId },
      relations: ["roles"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    const role = await roleRepo.findOne({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error("Role not found");
    }

    const alreadyHasRole = user.roles.some((r) => r.id === role.id);
    if (alreadyHasRole) {
      throw new Error("User already has this role");
    }

    user.roles.push(role);
    return userRepo.save(user);
  }
}
