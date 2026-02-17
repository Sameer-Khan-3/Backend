import { Request, Response } from "express";
import { UserService } from "../services/user.service";

const service = new UserService();

export async function createUser(req: Request, res: Response) {
  const user = await service.create(req.body);
  res.status(201).json(user);
}

export function getUsers(req: Request, res: Response) {
  res.json(service.findAll());
}

export function getUserById(req: Request, res: Response) {
  const user = service.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json(user);
}

export function updateUser(req: Request, res: Response) {
  const user = service.update(req.params.id, req.body);
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json(user);
}

export function deleteUser(req: Request, res: Response) {
  const user = service.delete(req.params.id);
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted successfully" });
}
