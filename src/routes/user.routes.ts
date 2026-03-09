import { Router } from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createUser,
  getUsersByDepartment,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

router.post("/", authenticate, authorizeRoles("Admin"), createUser);
router.get("/", authenticate, authorizeRoles("Admin"), getUsers);
router.get(
  "/department",
  authenticate,
  authorizeRoles("Employee", "Manager"),
  getUsersByDepartment
);
router.get("/:id", authenticate, getUser);
router.put("/:id", authenticate, updateUser);
router.delete("/:id", authenticate, authorizeRoles("Admin"), deleteUser);

export default router;
