import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const normalizedAllowedRoles = allowedRoles.map((role) =>
      role.toLowerCase()
    );

    const hasRole = req.user.roles.some((role: string) =>
      normalizedAllowedRoles.includes(role.toLowerCase())
    );

    if (!hasRole) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}
