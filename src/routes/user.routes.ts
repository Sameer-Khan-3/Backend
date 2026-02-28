// src/routes/user.routes.ts

import { Router } from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

// GET all users (ADMIN only)
router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  getUsers
);

// GET single user (authenticated users only)
router.get(
  "/:id",
  authenticate,
  getUser
);

// UPDATE user (authenticated users only)
router.put(
  "/:id",
  authenticate,
  updateUser
);

// DELETE user (ADMIN only)
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteUser
);

export default router;