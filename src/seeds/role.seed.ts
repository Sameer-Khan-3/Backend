import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";

const defaultRoles = ["SuperAdmin", "Admin", "Manager", "Employee"];

export async function seedRoles() {
  const roleRepo = AppDataSource.getRepository(Role);

  for (const roleName of defaultRoles) {
    const exists = await roleRepo.findOne({
      where: { name: roleName },
    });

    if (exists) {
      console.log(`Role ${roleName} already exists`);
      continue;
    }

    const role = roleRepo.create({ name: roleName });
    await roleRepo.save(role);
    console.log(`Role ${roleName} created`);
  }

  console.log("Roles seeded successfully");
}
