import { AppDataSource } from "../config/data-source";
import { seedRBAC } from "./rbac.seed";
import { seedAdmin } from "./admin.seed";

async function runSeeds() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log("Database connected successfully");

    // Run RBAC + Admin seeders
    await seedRBAC();
    await seedAdmin();

    console.log("All seeds executed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

runSeeds();
