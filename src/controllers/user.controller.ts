import { Request, Response } from "express";
import { UserService } from "../services/user.service";

export class UserController {

  static getUsers(req: Request, res: Response) {
    res.json(UserService.getAll());
  }

  static getUser(req: Request, res: Response) {
    const user = UserService.getById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  }

  static createUser(req: Request, res: Response) {
    const { name, email, role } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = UserService.create({ name, email, role });

    return res.status(201).json(user);
  }

  static updateUser(req: Request, res: Response) {
    const user = UserService.update(req.params.id, req.body);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  }

  static deleteUser(req: Request, res: Response) {
    const success = UserService.delete(req.params.id);

    if (!success) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.sendStatus(204);
  }
}
