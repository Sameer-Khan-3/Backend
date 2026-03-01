import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";

async function seed() {
    await AppDataSource.initialize();


    const roleRepo = AppDataSource.getRepository(Role);
    const permissionRepo = AppDataSource.getRepository(Permission);

    //-------Create Permissions--------//
    const permissionsList = [
        "CREATE_USER",
        "DELETE_USER",
        "VIEW_USER",
        "UPDATE_USER",
        "ASSIGN_ROLE",
    ];

    const permissions: Permission[] = [];

    for (const name of permissionsList) {
        let permission = await permissionRepo.findOne({ where: { name } });

        if (!permission) {
            permission = permissionRepo.create({ name });
            await permissionRepo.save(permission);
        }

        permissions.push(permission);
    }

    console.log("Permissions seeded successfully");

    //-----Create Roles---------//
    const roleNames = ["ADMIN", "MANAGER", "EMPLOYEE"];

for (const roleName of roleNames) {
  let role = await roleRepo.findOne({
    where: { name: roleName },
    relations: ["permissions"],
  });

  if (!role) {
    role = roleRepo.create({ name: roleName });
  }

  if (roleName === "ADMIN") {
    role.permissions = permissions;
  }

  if (roleName === "MANAGER") {
    role.permissions = permissions.filter(
      (p) => p.name !== "DELETE_USER"
    );
  }

  if (roleName === "EMPLOYEE") {
    role.permissions = permissions.filter(
      (p) => p.name === "VIEW_USER"
    );
  }

  await roleRepo.save(role);
}

console.log("✅ Roles seeded successfully");

    process.exit();
}

seed().catch((err)=> {
    console.error("Seeding failed:", err)
});