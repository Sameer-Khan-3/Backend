import { Request, Response } from "express";
import { DepartmentService } from "../services/department.service";
import { error } from 'console';

const departmentService = new DepartmentService();

export async function createDepartment(req: Request, res: Response) {
  try {
    const { name } = req.body;
    const department = await departmentService.createDepartment(name);
    res.status(201).json(department);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function assignManager(req: Request, res: Response) {
  try {
    const { departmentId, userId } = req.body;
    const result = await departmentService.assignManager(
      departmentId,
      userId
    );
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function assignUserToDepartment(req: Request, res: Response) {
  try {
    const { userId, departmentId } = req.body;

    const result = await departmentService.assignUserToDepartment(
      userId,
      departmentId
    );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function getDepartments(req: Request, res: Response) {
  try {
    const departments = await departmentService.listDepartments();
    res.status(200).json(departments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
//Get Single
export async function getDepartmentById(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        const department = await departmentService.getDepartmentById(id);
        res.status(200).json(department);
    }    catch (error: any) {
        res.status(404).json({message: error.message})
    }
}
//update
export async function updateDepartment(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        const department = await departmentService.getDepartmentById(id);
        res.status(200).json(department);
    } catch (error: any) {
        res.status(404).json({ message: error.message });
    }
}

//Delete
export async function deleteDepartment(req: Request, res: Response){
    try {
        const id = Number(req.params.is);
        const result = await departmentService.deleteDepartment(id);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({message: error.message});
    }
}