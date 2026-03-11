import { Router } from "express";
import {
  createDepartment,
  assignManager,
  assignUserToDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

/*Create a new department*/
router.post("/", authenticate, authorizeRoles("Admin"), createDepartment);

/*Get all departments*/
router.get("/", authenticate, authorizeRoles("Admin", "Manager", "Employee"), getDepartments);

/*Get single department by ID*/
router.get("/:id", authenticate, authorizeRoles("Admin", "Manager", "Employee"), getDepartmentById);

/*Update department name*/
router.put("/:id", authenticate, authorizeRoles("Admin", "Manager"), updateDepartment);

/*Delete department by ID*/
router.delete("/:id", authenticate, authorizeRoles("Admin"), deleteDepartment);

/*Assign a manager to a department*/
router.post("/assign-manager", authenticate, authorizeRoles("Admin"), assignManager);

/*Assign a user (employee) to a department*/
router.post("/assign-user", authenticate, authorizeRoles("Admin", "Manager"), assignUserToDepartment);

export default router;