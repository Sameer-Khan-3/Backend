import { Router } from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createUser
} from "../controllers/user.controller";
import { getUsersByDepartment} from "../controllers/user.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

// CREATE user (ADMIN only)
router.post("/", authenticate, authorizeRoles("Admin"), createUser);

// GET all users (ADMIN only)
router.get("/", authenticate, authorizeRoles("Admin"), getUsers);

router.delete("/users/:id", deleteUser);


router.get(
  "/department",
  authenticate,
  authorizeRoles("Employee", "Manager"),
  getUsersByDepartment
);
// GET single user (authenticated)
router.get("/:id", authenticate, getUser);

// UPDATE user (authenticated)
router.put("/:id", authenticate, updateUser);

// DELETE user (ADMIN only)
router.delete("/:id", authenticate, authorizeRoles("Admin"), deleteUser);

export default router;