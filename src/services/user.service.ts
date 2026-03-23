import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/role";
import { Roles } from "../utils/roles.enum";

const userRepo = AppDataSource.getRepository(User);
const roleRepo = AppDataSource.getRepository(Role);

type CreateUserInput = Partial<User> & {
  password?: string;
};

type UpdateUserInput = Partial<User> & {
  password?: string;
};

export class UserService {
  async create(data: CreateUserInput) {
    const existing = await userRepo.findOne({
      where: [{ email: data.email }, { username: data.username }],
    });

    if (existing) {
      throw new Error("User already exists");
    }

    const employeeRole = await roleRepo.findOne({
      where: { name: Roles.Employee },
    });

    if (!employeeRole) {
      throw new Error("Default role not found. Seed roles first.");
    }

    const { password: _password, ...persistedData } = data;
    const user = userRepo.create({
      ...persistedData,
      role: employeeRole,
    });

    return userRepo.save(user);
  }

  async findAll() {
    return userRepo.find({
      relations: ["role", "department"],
    });
  }

  async findOne(id: string) {
    const user = await userRepo.findOne({
      where: { id },
      relations: ["role", "department"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async update(id: string, data: UpdateUserInput) {
    const user = await this.findOne(id);

    const { password: _password, ...persistedData } = data;
    userRepo.merge(user, persistedData);
    return userRepo.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    user.isActive = false;
    user.role = null;
    user.department = null;
    await userRepo.save(user);
    return { message: "User deleted successfully" };
  }
}
