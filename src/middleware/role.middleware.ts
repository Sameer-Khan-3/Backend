import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log("req.user is empty - forbidden:"+ req.user);
      return res.status(403).json({ message: "Forbidden" });
    }
    console.log("req.user not empty");
    const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());

    const groups = req.user["cognito:groups"] || [];

    console.log("groups: " + groups);
    console.log("normalizedAllowedRoles: " + normalizedAllowedRoles)
    const hasRole = groups.some((g: string) =>
      normalizedAllowedRoles.includes(g.toLowerCase())
    );

    if (!hasRole) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}