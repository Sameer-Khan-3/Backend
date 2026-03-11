import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const normalizedAllowedRoles = allowedRoles.map((role) =>
      role.toLowerCase()
    );

    const tokenRole =
      typeof req.user.role === "string"
        ? req.user.role
        : Array.isArray(req.user.roles)
        ? req.user.roles[0]
        : null;

    if (!tokenRole) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const hasRole = normalizedAllowedRoles.includes(tokenRole.toLowerCase());

    if (!hasRole) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}
