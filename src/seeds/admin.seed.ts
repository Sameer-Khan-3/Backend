import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/role";
import {
  createCognitoUser,
  deleteCognitoUser,
  getCognitoUserIdentity,
  setCognitoUserPassword,
} from "../services/cognito.service";

export const seedAdmin = async () => {
  const userRepo = AppDataSource.getRepository(User);
  const roleRepo = AppDataSource.getRepository(Role);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminUsername || !adminPassword) {
    return;
  }

  const adminRole = await roleRepo.findOne({
    where: { name: "Admin" },
  });

  if (!adminRole) {
    return;
  }

  const existingAdmin = await userRepo.findOne({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    return;
  }

  await createCognitoUser(adminEmail, adminRole.name, {
    formattedName: adminUsername,
    suppressMessage: true,
  });
  const cognitoUser = await getCognitoUserIdentity(adminEmail);

  try {
    await setCognitoUserPassword(adminEmail, adminPassword);

    const adminUser = userRepo.create({
      username: adminUsername,
      email: adminEmail,
      cognitoUsername: cognitoUser.cognitoUsername,
      cognitoSub: cognitoUser.cognitoSub,
      isActive: true,
      role: adminRole,
    });

    await userRepo.save(adminUser);
  } catch (error) {
    await deleteCognitoUser(cognitoUser.cognitoUsername).catch(() => undefined);
    throw error;
  }
};
