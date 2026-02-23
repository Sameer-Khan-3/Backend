import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";

export const seedRBAC = async () => {
  const roleRepo = AppDataSource.getRepository(Role);
  const permissionRepo = AppDataSource.getRepository(Permission);

  console.log("🌱 Seeding RBAC...");

  // 1️⃣ Create Permissions
  const permissionsList = [
    "create_user",
    "update_user",
    "delete_user",
    "view_users",
    "assign_role",
    "manage_departments",
    "view_self",
  ];

  const permissionEntities: Permission[] = [];

  for (const perm of permissionsList) {
    let permission = await permissionRepo.findOne({ where: { name: perm } });

    if (!permission) {
      permission = permissionRepo.create({ name: perm });
      await permissionRepo.save(permission);
    }

    permissionEntities.push(permission);
  }

  // 2️⃣ Create Roles
  const rolesList = ["Admin", "Manager", "Employee"];

  const roleEntities: Record<string, Role> = {};

  for (const roleName of rolesList) {
    let role = await roleRepo.findOne({ where: { name: roleName } });

    if (!role) {
      role = roleRepo.create({ name: roleName });
      await roleRepo.save(role);
    }

    roleEntities[roleName] = role;
  }

  // 3️⃣ Assign Permissions to Roles

  const adminPermissions = permissionEntities; // All
  const managerPermissions = permissionEntities.filter((p) =>
    ["create_user", "update_user", "view_users"].includes(p.name)
  );
  const employeePermissions = permissionEntities.filter(
    (p) => p.name === "view_self"
  );

  roleEntities["Admin"].permissions = adminPermissions;
  roleEntities["Manager"].permissions = managerPermissions;
  roleEntities["Employee"].permissions = employeePermissions;

  await roleRepo.save(roleEntities["Admin"]);
  await roleRepo.save(roleEntities["Manager"]);
  await roleRepo.save(roleEntities["Employee"]);

  console.log("RBAC Seed Completed");
};