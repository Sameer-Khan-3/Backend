import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());

    const groups = req.user["cognito:groups"] || [];
    const hasRole = groups.some((g: string) =>
      normalizedAllowedRoles.includes(g.toLowerCase())
    );

    if (!hasRole) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}