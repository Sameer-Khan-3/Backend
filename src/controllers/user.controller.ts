import { Request, Response } from "express";
import { UserService } from "../services/user.service";

const service = new UserService();

export async function createUser(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body;

    // Required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // If valid → create user
    const user = await service.create({ username, email, password });

    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create user",
      error: error.message,
    });
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