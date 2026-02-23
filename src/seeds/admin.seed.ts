import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import * as bcrypt from "bcrypt";

export const seedAdmin = async () => {
  const userRepo = AppDataSource.getRepository(User);
  const roleRepo = AppDataSource.getRepository(Role);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminUsername || !adminPassword) {
    console.log("❌ Admin credentials missing in .env");
    return;
  }

  console.log("👑 Seeding Admin...");

  const adminRole = await roleRepo.findOne({
    where: { name: "Admin" },
  });

  if (!adminRole) {
    console.log("❌ Admin role not found. Run RBAC seed first.");
    return;
  }

  const existingAdmin = await userRepo.findOne({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("⚠️ Admin already exists. Skipping...");
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = userRepo.create({
    username: adminUsername,
    email: adminEmail,
    password: hashedPassword,
    isActive: true,
    mustChangePassword: true, // 🔥 important
    roles: [adminRole],
  });

  await userRepo.save(adminUser);

  console.log("✅ Admin created successfully");
  console.log("⚠️ Must change password on first login");
};