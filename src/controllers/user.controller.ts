import { Request, Response } from "express";
import { UserService } from "../services/user.service";

const service = new UserService();

export async function createUser(req: Request, res: Response) {
  try {
    const user = await service.create(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await service.findAll();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function getUser(req: Request, res: Response) {
  try {
    const user = await service.findOne(req.params.id);
    res.json(user);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const user = await service.update((req.params.id), req.body);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const result = await service.remove((req.params.id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}