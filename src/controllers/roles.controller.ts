import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.middleware";
import * as service from "../services/roles.service";

const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required"),
});

const idParamSchema = z.object({
  id: z.string().min(1, "Invalid role id"),
});

export async function createRole(req: AuthRequest, res: Response) {
  try {
    const parsed = createRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const role = await service.createRole(parsed.data.name);
    res.status(201).json(role);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function getRoles(req: AuthRequest, res: Response) {
  try {
    const roles = await service.findAllRoles();
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function getRole(req: AuthRequest, res: Response) {
  try {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const role = await service.findRoleById(parsed.data.id);
    res.json(role);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
}

export async function deleteRole(req: AuthRequest, res: Response){
    try{ 
        const parsed = idParamSchema.safeParse(req.params);
        if (!parsed.success) {
          return res.status(400).json({
            message: "Invalid request",
            errors: parsed.error.flatten().fieldErrors,
          });
        }
        const result = await service.deleteRole(parsed.data.id);
        res.json(result);
    } catch (error: any) {
        res.status(404).json({message: error.message});
    }
}