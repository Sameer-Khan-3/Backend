import { AppDataSource } from "../config/data-source";
import { seedRoles } from "./role.seed";

async function runSeeds() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log("Database connected successfully");

    // Run role seeder
    await seedRoles();

    console.log("All seeds executed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

runSeeds();