import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { resolveRequestRole } from "../utils/role.utils";

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());
    const resolvedRole = resolveRequestRole(req).toLowerCase();
    const hasRole = normalizedAllowedRoles.includes(resolvedRole);

    if (!hasRole) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}
