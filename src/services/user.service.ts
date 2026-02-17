import { User } from "../models/user.model";
import bcrypt from "bcrypt";

const users: User[] = [];

export class UserService {
  async create(data: Omit<User, "id">) {
    const user: User = {
      ...data,
      id: Date.now().toString(),
      password: await bcrypt.hash(data.password, 10),
    };

    users.push(user);
    return user;
  }

  findAll() {
    return users;
  }

  findById(id: string) {
    return users.find(u => u.id === id);
  }

  update(id: string, updates: Partial<User>) {
    const user = users.find(u => u.id === id);
    if (!user) return null;

    Object.assign(user, updates);
    return user;
  }

  delete(id: string) {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;

    const removed = users.splice(index, 1);
    return removed[0];
  }
}
