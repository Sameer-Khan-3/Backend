import { AppDataSource } from "../config/data-source";
import { seedRBAC } from "./rbac.seed";
import { seedAdmin } from "./admin.seed";

const runSeeds = async () => {
  await AppDataSource.initialize();
  await seedRBAC();
  await seedAdmin();
  process.exit(0);
};

runSeeds().catch(() => {
  process.exit(1);
});
