import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";

const roleRepository = AppDataSource.getRepository(Role);

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