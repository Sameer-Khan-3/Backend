import { Router } from "express";
import { getDashboardMetrics } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

router.get(
  "/metrics",
  authenticate,
  authorizeRoles("Admin", "Manager", "Employee"),
  getDashboardMetrics
);

export default router;
