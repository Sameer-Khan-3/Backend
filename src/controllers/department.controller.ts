import { Request, Response } from "express";
import { z } from "zod";
import { DepartmentService } from "../services/department.service";


const departmentService = new DepartmentService();

const idParamSchema = z.object({
  id: z.string().min(1, "Invalid department id"),
});

const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required"),
});

const assignManagerSchema = z.object({
  departmentId: z.string().min(1, "Department id is required"),
  userId: z.string().min(1, "User id is required"),
});

const assignUserSchema = z.object({
  userId: z.string().min(1, "User id is required"),
  departmentId: z.string().min(1, "Department id is required"),
});

const updateDepartmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required"),
});

export async function createDepartment(req: Request, res: Response) {
  try {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { name } = parsed.data;
    const department = await departmentService.createDepartment(name);
    res.status(201).json(department);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function assignManager(req: Request, res: Response) {
  try {
    const parsed = assignManagerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { departmentId, userId } = parsed.data;
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
    const parsed = assignUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { userId, departmentId } = parsed.data;

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
        const parsed = idParamSchema.safeParse(req.params);
        if (!parsed.success) {
          return res.status(400).json({
            message: "Invalid request",
            errors: parsed.error.flatten().fieldErrors,
          });
        }
        const { id } = parsed.data;
        const department = await departmentService.getDepartmentById(id);
        res.status(200).json(department);
    }    catch (error: any) {
        res.status(404).json({message: error.message})
    }
}
//update
export async function updateDepartment(req: Request, res: Response) {
  try {
    const paramsParsed = idParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: paramsParsed.error.flatten().fieldErrors,
      });
    }
    const bodyParsed = updateDepartmentSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: bodyParsed.error.flatten().fieldErrors,
      });
    }
    const { id } = paramsParsed.data;
    const { name } = bodyParsed.data;

    const department = await departmentService.updateDepartment(id, name);

    res.status(200).json(department);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
}

//Delete
export async function deleteDepartment(req: Request, res: Response){
    try {
        const parsed = idParamSchema.safeParse(req.params);
        if (!parsed.success) {
          return res.status(400).json({
            message: "Invalid request",
            errors: parsed.error.flatten().fieldErrors,
          });
        }
        const { id } = parsed.data;
        const result = await departmentService.deleteDepartment(id);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({message: error.message});
    }
}