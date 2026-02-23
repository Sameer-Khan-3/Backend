import { Router } from "express";
import {
  createDepartment,
  assignManager,
  assignUserToDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from "../controllers/department.controller";

const router = Router();

/*Create a new department*/
router.post("/", createDepartment);

/*Get all departments*/
router.get("/", getDepartments);

/*Get single department by ID*/
router.get("/:id", getDepartmentById);

/*Update department name*/
router.put("/:id", updateDepartment);

/*Delete department by ID*/
router.delete("/:id", deleteDepartment);

/*Assign a manager to a department*/
router.post("/assign-manager", assignManager);

/*Assign a user (employee) to a department*/
router.post("/assign-user", assignUserToDepartment);

export default router;