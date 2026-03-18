import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { DashboardService } from "../services/dashboard.service";

const dashboardService = new DashboardService();

const resolveRequestRole = (req: AuthRequest): string | null => {
  return req.user?.role || req.user?.["cognito:groups"]?.[0] || null;
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
      userId || "",
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
