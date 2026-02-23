import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as service from "../services/roles.service";

export async function createRole(req: AuthRequest, res: Response) {
  try {
    const role = await service.createRole(req.body.name);
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
    const role = await service.findRoleById(req.params.id);
    res.json(role);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
}

export async function deleteRole(req: AuthRequest, res: Response){
    try{ 
        const result = await service.deleteRole(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(404).json({message: error.message});
    }
}
