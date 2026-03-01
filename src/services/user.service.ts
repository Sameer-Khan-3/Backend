import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import bcrypt from "bcrypt";

const userRepo = AppDataSource.getRepository(User);
const roleRepo = AppDataSource.getRepository(Role);

export class UserService {

  // Create User with default EMPLOYEE role
  async create(data: Partial<User>) {

    const existing = await userRepo.findOne({
      where: [{ email: data.email }, { username: data.username }]
    });

    if (existing) {
      throw new Error("User already exists");
    }

    // Hash password
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Find EMPLOYEE role
    const employeeRole = await roleRepo.findOne({
      where: { name: "EMPLOYEE" }
    });

    if (!employeeRole) {
      throw new Error("Default role not found. Run seed first.");
    }

    // Create user
    const user = userRepo.create({
      ...data,
      roles: [employeeRole]   //Assign default role here
    });

    return await userRepo.save(user);
  }

  // Get All Users
  async findAll() {
    return await userRepo.find({
      relations: ["roles"]
    });
  }

  // Get One User
  async findOne(id: number) {
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
  async update(id: number, data: Partial<User>) {
    const user = await this.findOne(id);

    userRepo.merge(user, data);
    return await userRepo.save(user);
  }

  // Delete User
  async remove(id: number) {
    const user = await this.findOne(id);
    await userRepo.remove(user);

    return { message: "User deleted successfully" };
  }
}