import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";

const defaultRoles = [
  { name: "SuperAdmin", parent: null },
  { name: "Admin", parent: "SuperAdmin" },
  { name: "Manager", parent: "Admin" },
  { name: "Employee", parent: "Manager" },
];

export async function seedRoles() {
  const roleRepo = AppDataSource.getRepository(Role);

  for (const roleData of defaultRoles) {
    // Check if role already exists
    const exists = await roleRepo.findOne({
      where: { name: roleData.name },
    });

    if (exists) {
      console.log(`Role ${roleData.name} already exists`);
      continue;
    }

    // Find parent role if exists
    let parentRole = null;
    if (roleData.parent) {
      parentRole = await roleRepo.findOne({
        where: { name: roleData.parent },
      });

      if (!parentRole) {
        console.warn(
          `Parent role ${roleData.parent} not found for ${roleData.name}`
        );
      }
    }

    // Create role
    const role = roleRepo.create({
      name: roleData.name,
      parent: parentRole,
    });

    await roleRepo.save(role);
    console.log(`Role ${roleData.name} created`);
  }

  console.log("Employee-Manager hierarchy seeded successfully");
}