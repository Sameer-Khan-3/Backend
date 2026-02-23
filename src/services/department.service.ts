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

  async assignManager(departmentId: number, userId: string) {
    const department = await departmentRepo.findOne({
      where: { id: departmentId },
    });

    if (!department) throw new Error("Department not found");

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    department.manager = user;
    return await departmentRepo.save(department);
  }

  async assignUserToDepartment(userId: string, departmentId: number){
    const user = await userRepo.findOne({ where: { id: userId } });
    if(!user) throw new Error("User Not Found");
    
    const department = await departmentRepo.findOne({ where: {id: departmentId},});
    if(!department) throw new Error("Department Not Found");
    
    user.department = department;
    return await userRepo.save(user);
  }

  async getDepartmentById(id: number){
    const department = await departmentRepo.findOne({
        where: { id },
        relations: ["manager", "employees"],
    });
    if(!department) throw new Error("Department not found");
    return department;
  }

  async updateDepartment(id: number, name: string){
    const department = await departmentRepo.findOne({
        where: { id },
    });
    if(!department) throw new Error("Department not Found");

    department.name = name;
    return await departmentRepo.save(department);
  }

  async deleteDepartment(id: number){
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