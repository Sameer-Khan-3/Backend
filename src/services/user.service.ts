import { User, users } from "../models/user.model";
import { randomUUID } from "crypto";

export class UserService {

  static getAll(): User[] {
    return users;
  }

  static getById(id: string): User | undefined {
    return users.find(user => user.id === id);
  }

  static create(data: Omit<User, "id">): User {
    const newUser: User = {
      id: randomUUID(),
      ...data,
    };

    users.push(newUser);
    return newUser;
  }

  static update(id: string, data: Partial<Omit<User, "id">>): User | null {
    const user = this.getById(id);
    if (!user) return null;

    Object.assign(user, data);
    return user;
  }

  static delete(id: string): boolean {
    const index = users.findIndex(user => user.id === id);
    if (index === -1) return false;

    users.splice(index, 1);
    return true;
  }
}
