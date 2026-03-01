import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";


const defaultRoles = [
  { name: "SuperAdmin", parent: null },
  { name: "Admin", parent: "SuperAdmin" },
  { name: "Manager", parent: "Admin" },
  { name: "Employee", parent: "Manager" },
];

async function seedRoles() {
  await AppDataSource.initialize();

  const roleRepo = AppDataSource.getRepository(Role);

  for (const roleData of defaultRoles) {
    let parentRole = null;

    if (roleData.parent) {
      parentRole = await roleRepo.findOne({
        where: { name: roleData.parent },
      });
    }

    const exists = await roleRepo.findOne({
      where: { name: roleData.name },
    });

    if (!exists) {
      const role = roleRepo.create({
        name: roleData.name,
        parent: parentRole,
      });

      await roleRepo.save(role);
      console.log(`Role ${roleData.name} created`);
    }
  }

  console.log("Employee-Manager hierarchy seeded");
  process.exit(0);
}

seedRoles();