import { AuthRequest } from "../middleware/auth.middleware";
import { Roles } from "./roles.enum";

export const normalizeRole = (value: unknown): Roles | null => {
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

export const resolveRequestRole = (req: AuthRequest): Roles => {
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
