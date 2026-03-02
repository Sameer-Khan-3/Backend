import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import bcrypt from "bcrypt";

const userRepo = AppDataSource.getRepository(User);
const roleRepo = AppDataSource.getRepository(Role);

export class UserService {

  // Create User with default Employee role
  async create(data: Partial<User>) {

    // Check if email or username already exists
    const existing = await userRepo.findOne({
      where: [
        { email: data.email },
        { username: data.username }
      ]
    });

    if (existing) {
      throw new Error("User already exists");
    }

    // Hash password
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // IMPORTANT: Make sure this matches EXACT role name in DB
    const employeeRole = await roleRepo.findOne({
      where: { name: "Employee" }
    });

    console.log("Employee Role:", employeeRole);

    if (!employeeRole) {
      console.log("Available roles:", await roleRepo.find());
      throw new Error("Default role not found. Seed roles first.");
    }

    const user = userRepo.create({
      ...data,
      roles: [employeeRole]
    });

    return await userRepo.save(user);
  }

  // Get All Users
  async findAll() {
    return await userRepo.find({
      relations: ["roles"]
    });
  }

  // Get One User (UUID string)
  async findOne(id: string) {
    const user = await userRepo.findOne({
      where: { id },
      relations: ["roles"]
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  // Update User
  async update(id: string, data: Partial<User>) {
    const user = await this.findOne(id);

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    userRepo.merge(user, data);
    return await userRepo.save(user);
  }

  // Delete User
  async remove(id: string) {
    const user = await this.findOne(id);
    await userRepo.remove(user);
    return { message: "User deleted successfully" };
  }

  // Assign Role to User
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

    const alreadyHasRole = user.roles.some(r => r.id === role.id);

    if (alreadyHasRole) {
      throw new Error("User already has this role");
    }

    user.roles.push(role);

    return await userRepo.save(user);
  }
}