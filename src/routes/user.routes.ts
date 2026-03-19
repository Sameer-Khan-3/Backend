import { Router } from "express";
import {
  getUsers,
  getCurrentUser,
  getUser,
  updateUser,
  deleteUser,
  createUser,
  getUsersByDepartment,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

router.post("/", authenticate, authorizeRoles("Admin", "Manager"), createUser);
router.get("/", authenticate, authorizeRoles("Admin"), getUsers);
router.get("/me", authenticate, authorizeRoles("Admin", "Employee", "Manager"), getCurrentUser);
router.get("/department", authenticate, authorizeRoles("Admin", "Employee", "Manager"), getUsersByDepartment);
router.get("/:id", authenticate, authorizeRoles("Admin", "Manager", "Employee"), getUser);
router.put("/:id", authenticate, authorizeRoles("Admin", "Manager"), updateUser);
router.delete("/:id", authenticate, authorizeRoles("Admin"), deleteUser);

export default router;
