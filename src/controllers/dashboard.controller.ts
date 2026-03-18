import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { DashboardService } from "../services/dashboard.service";
import { Roles } from "../utils/roles.enum";
import { resolveRequestRole } from "../utils/role.utils";

const dashboardService = new DashboardService();

export async function getDashboardMetrics(req: AuthRequest, res: Response) {
  try {
    const role = resolveRequestRole(req);
    const cognitoSub = req.user?.sub || undefined;
    const userId = req.user?.id || undefined;
    const userEmail = req.user?.email || null;
    const isAdmin = role === Roles.Admin;

    if (!role) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!isAdmin && !cognitoSub && !userEmail && !userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const metrics = await dashboardService.getMetrics(
      role,
      userEmail || undefined,
      cognitoSub,
      userId
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
