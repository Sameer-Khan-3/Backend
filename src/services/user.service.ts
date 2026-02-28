import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";

const userRepo = AppDataSource.getRepository(User);

export class UserService {

  // Create User
  async create(data: Partial<User>) {
    const existing = await userRepo.findOne({
      where: [{ email: data.email }, { username: data.username }]
    });

    if (existing) {
      throw new Error("User already exists");
    }

    const user = userRepo.create(data);
    return await userRepo.save(user);
  }

  // Get All Users
  async findAll() {
    return await userRepo.find();
  }

  // Get One User
  async findOne(id: number) {
    const user = await userRepo.findOne({
      where: { id }
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