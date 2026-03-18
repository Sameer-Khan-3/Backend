import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { DashboardService } from "../services/dashboard.service";
import { Roles } from "../utils/roles.enum";

const dashboardService = new DashboardService();

const normalizeRole = (value: unknown): Roles | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  return (
    Object.values(Roles).find(
      (role) => role.toLowerCase() === normalizedValue
    ) || null
  );
};

const resolveRequestRole = (req: AuthRequest): Roles => {
  const directRole = normalizeRole(req.user?.role);
  if (directRole) {
    return directRole;
  }

  const groups = Array.isArray(req.user?.["cognito:groups"])
    ? req.user["cognito:groups"]
    : [];

  for (const role of [Roles.Admin, Roles.Manager, Roles.Employee]) {
    if (groups.some((group) => normalizeRole(group) === role)) {
      return role;
    }
  }

  return Roles.Employee;
};

export async function getDashboardMetrics(req: AuthRequest, res: Response) {
  try {
    const role = resolveRequestRole(req);
    const userId = req.user?.id || undefined;
    const userEmail = req.user?.email || null;
    const userName =
      req.user?.username || req.user?.["cognito:username"] || undefined;

    if (!role || !userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const metrics = await dashboardService.getMetrics(
      role,
      userId,
      userEmail || undefined
    );
    res.status(200).json(metrics);
  } catch (error: any) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load dashboard metrics";

    if (message.toLowerCase().includes("not assigned")) {
      return res.status(400).json({ message });
    }

    res.status(500).json({ message });
  }
}
