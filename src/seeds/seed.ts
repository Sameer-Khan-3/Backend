import { AppDataSource } from "../config/data-source";
import { seedRBAC } from "./rbac.seed";
import { seedAdmin } from "./admin.seed";

async function runSeeds() {
  try {
    await AppDataSource.initialize();
    await seedRBAC();
    await seedAdmin();
    process.exit(0);
  } catch {
    process.exit(1);
  }
}

runSeeds();
