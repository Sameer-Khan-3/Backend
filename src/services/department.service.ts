import { error } from "console";
import { AppDataSource } from "../config/data-source";
import { Department } from "../entities/Department";
import { User } from "../entities/User";

const departmentRepo = AppDataSource.getRepository(Department);
const userRepo = AppDataSource.getRepository(User);

export class DepartmentService {

  async createDepartment(name: string) {
    const existing = await departmentRepo.findOne({ where: { name } });
    if (existing) throw new Error("Department already exists");

    const department = departmentRepo.create({ name });
    return await departmentRepo.save(department);
  }

  async assignManager(departmentId: string, userId: string) {
    const department = await departmentRepo.findOne({
      where: { id: departmentId },
      relations: ["manager"],
    });

    if (!department) throw new Error("Department not found");

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const existingManagerDept = await departmentRepo.findOne({
      where: { manager: { id: userId } },
      relations: ["manager"],
    });

    if (existingManagerDept && existingManagerDept.id !== departmentId) {
      throw new Error("Manager is already assigned to another department");
    }

    if (department.manager && department.manager.id !== userId) {
      throw new Error("Department already has a manager");
    }

    department.manager = user;
    return await departmentRepo.save(department);
  }

  async assignUserToDepartment(userId: string, departmentId: string){
    const user = await userRepo.findOne({
      where: { id: userId },
      relations: ["role"],
    });
    if(!user) throw new Error("User Not Found");
    
    const department = await departmentRepo.findOne({
      where: { id: departmentId },
      relations: ["manager"],
    });
    if(!department) throw new Error("Department Not Found");

    const isManager = user.role?.name?.toLowerCase() === "manager";

    if (isManager) {
      const existingManagerDept = await departmentRepo.findOne({
        where: { manager: { id: userId } },
        relations: ["manager"],
      });

      if (existingManagerDept && existingManagerDept.id !== departmentId) {
        throw new Error("Manager is already assigned to another department");
      }

      if (department.manager && department.manager.id !== userId) {
        throw new Error("Department already has a manager");
      }

      department.manager = user;
      await departmentRepo.save(department);
    }
    
    user.department = department;
    return await userRepo.save(user);
  }

  async getDepartmentById(id: string){
    const department = await departmentRepo.findOne({
        where: { id },
        relations: ["manager", "employees"],
    });
    if(!department) throw new Error("Department not found");
    return department;
  }

  async updateDepartment(id: string, name: string){
    const department = await departmentRepo.findOne({
        where: { id },
    });
    if(!department) throw new Error("Department not Found");

    department.name = name.trim();
    return await departmentRepo.save(department);
  }

  async deleteDepartment(id: string){
    const department = await departmentRepo.findOne({
        where: {id},
        relations: ["employees"],
    });

    if(!department) throw new Error("Department not Found");

    for (const user of department.employees){
        user.department = null as any;
        await userRepo.save(user);
    }

    await departmentRepo.remove(department);

    return { message: "department deleted successfully" };
  }

  async listDepartments() {
    return await departmentRepo.find({
      relations: ["manager", "employees"],
    });
  }
}
