import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { Department } from "../entities/Department";


const service = new UserService();

export async function createUser(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body;
    // Required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }
    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }
    // If valid → create user
    const user = await service.create({ username, email, password });

    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create user",
      error: error.message,
    });
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const { id } = req.params;

    const user = await userRepo.findOne({ where: { id } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await userRepo.remove(user);

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const isAdmin = req.user?.roles
      ?.map((r: string) => r.toLowerCase())
      .includes("admin");

    if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const users = await service.findAll();
    res.json(users);

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export const getUsersByDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUser = await userRepo.findOne({
      where: { id: currentUserId },
      relations: ["department"],
    });

    if (!currentUser?.department?.id) {
      return res.status(400).json({ message: "User is not assigned to any department" });
    }

    const users = await userRepo.find({
      where: {
        department: {
          id: currentUser.department.id,
        },
      },
      relations: ["roles", "department"],
    });

    res.json(users);
  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch department users",
    });
  }
};

export async function getUser(req: AuthRequest, res: Response) {
  try {
    const requestedUserId = req.params.id;

    const isAdmin = req.user?.roles
      ?.map((r: string) => r.toLowerCase())
      .includes("admin");

    const isSelf = req.user?.id === requestedUserId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await service.findOne(requestedUserId);
    res.json(user);

  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
}

export const updateUser = async (req: Request, res: Response) => {
  try {

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const departmentRepo = AppDataSource.getRepository(Department);

    const { username, email, role, isActive, departmentId } = req.body;

    const user = await userRepo.findOne({
      where: { id: req.params.id },
      relations: ["roles", "department"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // update fields
    if (typeof username === "string") user.username = username;
    if (typeof email === "string") user.email = email;
    if (typeof isActive === "boolean") user.isActive = isActive;

    // update role
    if (typeof role === "string" && role.trim()) {
      const normalizedRole = role.trim().toLowerCase();
      const roleEntity = await roleRepo
        .createQueryBuilder("role")
        .where("LOWER(role.name) = :normalizedRole", { normalizedRole })
        .getOne();

      if (roleEntity) {
        user.roles = [roleEntity];
      }
    }

    if (departmentId !== undefined) {
      if (departmentId === null || departmentId === "") {
        user.department = null as any;
      } else {
        const parsedDepartmentId =
          typeof departmentId === "number"
            ? departmentId
            : Number(departmentId);

        if (Number.isNaN(parsedDepartmentId)) {
          return res.status(400).json({ message: "Invalid departmentId" });
        }

        const department = await departmentRepo.findOne({
          where: { id: parsedDepartmentId },
        });

        if (!department) {
          return res.status(404).json({ message: "Department not found" });
        }

        user.department = department;
      }
    }

    await userRepo.save(user);

    const updatedUser = await userRepo.findOne({
      where: { id: user.id },
      relations: ["roles", "department"],
    });

    res.json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};
