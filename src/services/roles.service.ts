import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/role";
import { User } from "../entities/User";

const roleRepository = AppDataSource.getRepository(Role);
const userRepository = AppDataSource.getRepository(User);

export async function createRole(name: string) {
  const existing = await roleRepository.findOne({ where: { name } });
  if (existing) {
    throw new Error("Role already exists");
  }

  const role = roleRepository.create({ name });
  return await roleRepository.save(role);
}

export async function findAllRoles() {
  return await roleRepository.find();
}

export async function findRoleById(id: string) {
  const role = await roleRepository.findOne({ where: { id } });
  if (!role) {
    throw new Error("Role not found");
  }
  return role;
}

export async function deleteRole(id: string) {
  const role = await findRoleById(id);
  await roleRepository.remove(role);
  return { message: "Role deleted successfully" };
}

export async function assignRoleToUser(userId: string, roleName: string) {
  const user = await userRepository.findOne({
    where: { id: userId },
    relations: ["role"],
  });

  if (!user) {
    throw new Error("User not found");
  }

  const role = await roleRepository.findOne({
    where: { name: roleName },
  });

  if (!role) {
    throw new Error("Role not found");
  }

  if (user.role?.id === role.id) {
    throw new Error("User already has this role");
  }

  user.role = role;
  return userRepository.save(user);
}
