import { AppDataSource } from "../config/data-source";
import { Department } from "../entities/Department";
import { User } from "../entities/User";

const userRepo = AppDataSource.getRepository(User);
const departmentRepo = AppDataSource.getRepository(Department);

export class DashboardService {
  async getMetrics(role: string, userId: string, userEmail?: string) {
    const isAdmin = role.toLowerCase() === "admin";

    let users: User[] = [];

    if (isAdmin) {
      users = await userRepo.find({
        relations: ["role", "department"],
      });
    } else {
      const whereClauses: Array<{ id?: string; email?: string }> = [];
      if (userId) {
        whereClauses.push({ id: userId });
      }
      if (userEmail) {
        whereClauses.push({ email: userEmail });
      }

      const currentUser = await userRepo.findOne({
        where: whereClauses.length > 0 ? whereClauses : { id: userId },
        relations: ["department"],
      });

      if (!currentUser?.department?.id) {
        throw new Error("User is not assigned to any department");
      }

      users = await userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.role", "role")
        .leftJoinAndSelect("user.department", "department")
        .where("department.id = :departmentId", {
          departmentId: currentUser.department.id,
        })
        .getMany();
    }

    const departments = await departmentRepo.find({
      relations: ["manager", "employees"],
    });

    const employees = users.filter(
      (user) => user.role?.name?.toLowerCase() === "employee"
    ).length;

    const managers = users.filter(
      (user) => user.role?.name?.toLowerCase() === "manager"
    ).length;

    const total = users.length;
    const active = users.filter((user) => user.isActive).length;
    const inactive = Math.max(0, total - active);

    const recentUsers = [...users]
      .filter((user) => Boolean(user.createdAt))
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    const topDepartments = [...departments]
      .map((dept) => ({
        id: dept.id,
        name: dept.name,
        count: dept.employees?.length ?? 0,
        manager: dept.manager?.username ?? null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return {
      employeeCount: employees,
      managerCount: managers,
      departmentCount: departments.length,
      totalUsers: total,
      activeUsers: active,
      inactiveUsers: inactive,
      recentUsers,
      topDepartments,
    };
  }
}
