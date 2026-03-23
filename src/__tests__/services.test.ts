export {};

{
  type QueryBuilderMock = {
    leftJoin: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orWhere: jest.Mock;
    select: jest.Mock;
    addSelect: jest.Mock;
    groupBy: jest.Mock;
    addGroupBy: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    take: jest.Mock;
    getCount: jest.Mock;
    getMany: jest.Mock;
    getOne: jest.Mock;
    getRawMany: jest.Mock;
  };

  const createQueryBuilderMock = (overrides?: {
    count?: number;
    many?: unknown[];
    one?: unknown;
    rawMany?: unknown[];
  }): QueryBuilderMock => {
    const builder = {} as QueryBuilderMock;

    builder.leftJoin = jest.fn().mockReturnValue(builder);
    builder.leftJoinAndSelect = jest.fn().mockReturnValue(builder);
    builder.where = jest.fn().mockReturnValue(builder);
    builder.andWhere = jest.fn().mockReturnValue(builder);
    builder.orWhere = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.addSelect = jest.fn().mockReturnValue(builder);
    builder.groupBy = jest.fn().mockReturnValue(builder);
    builder.addGroupBy = jest.fn().mockReturnValue(builder);
    builder.orderBy = jest.fn().mockReturnValue(builder);
    builder.limit = jest.fn().mockReturnValue(builder);
    builder.take = jest.fn().mockReturnValue(builder);
    builder.getCount = jest.fn().mockResolvedValue(overrides?.count ?? 0);
    builder.getMany = jest.fn().mockResolvedValue(overrides?.many ?? []);
    builder.getOne = jest.fn().mockResolvedValue(overrides?.one ?? null);
    builder.getRawMany = jest
      .fn()
      .mockResolvedValue(overrides?.rawMany ?? []);

    return builder;
  };

  const loadDashboardService = async () => {
    jest.resetModules();

    const mockUserRepo = {
      createQueryBuilder: jest.fn(),
    };
    const mockDepartmentRepo = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    jest.doMock("../config/data-source", () => ({
      AppDataSource: {
        getRepository: jest
          .fn()
          .mockReturnValueOnce(mockUserRepo)
          .mockReturnValueOnce(mockDepartmentRepo),
      },
    }));

    const { DashboardService } = await import("../services/dashboard.service");

    return { DashboardService, mockUserRepo, mockDepartmentRepo };
  };

  describe("DashboardService", () => {
    afterEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
    });

    it("returns admin dashboard metrics from repository queries", async () => {
      const { DashboardService, mockUserRepo, mockDepartmentRepo } =
        await loadDashboardService();

      const employeeCountQuery = createQueryBuilderMock({ count: 8 });
      const managerCountQuery = createQueryBuilderMock({ count: 2 });
      const totalUsersQuery = createQueryBuilderMock({ count: 10 });
      const activeUsersQuery = createQueryBuilderMock({ count: 7 });
      const inactiveUsersQuery = createQueryBuilderMock({ count: 3 });
      const recentUsers = [{ id: "user-1" }, { id: "user-2" }];
      const recentUsersQuery = createQueryBuilderMock({ many: recentUsers });
      const topDepartmentsQuery = createQueryBuilderMock({
        rawMany: [
          { id: "dept-1", name: "Engineering", count: "6", manager: "Alice" },
          { id: "dept-2", name: "Sales", count: "4", manager: null },
        ],
      });

      mockUserRepo.createQueryBuilder
        .mockReturnValueOnce(employeeCountQuery)
        .mockReturnValueOnce(managerCountQuery)
        .mockReturnValueOnce(totalUsersQuery)
        .mockReturnValueOnce(activeUsersQuery)
        .mockReturnValueOnce(inactiveUsersQuery)
        .mockReturnValueOnce(recentUsersQuery);
      mockDepartmentRepo.count.mockResolvedValue(2);
      mockDepartmentRepo.createQueryBuilder.mockReturnValue(topDepartmentsQuery);

      const result = await new DashboardService().getMetrics("Admin");

      expect(result).toEqual({
        employeeCount: 8,
        managerCount: 2,
        departmentCount: 2,
        totalUsers: 10,
        activeUsers: 7,
        inactiveUsers: 3,
        currentDepartment: null,
        recentUsers,
        topDepartments: [
          { id: "dept-1", name: "Engineering", count: 6, manager: "Alice" },
          { id: "dept-2", name: "Sales", count: 4, manager: null },
        ],
      });
      expect(mockDepartmentRepo.count).toHaveBeenCalledTimes(1);
      expect(topDepartmentsQuery.where).not.toHaveBeenCalled();
    });

    it("scopes non-admin metrics to the requester's department", async () => {
      const { DashboardService, mockUserRepo, mockDepartmentRepo } =
        await loadDashboardService();

      const resolveUserQuery = createQueryBuilderMock({
        one: { department: { id: "dept-1" } },
      });
      const employeeCountQuery = createQueryBuilderMock({ count: 5 });
      const managerCountQuery = createQueryBuilderMock({ count: 1 });
      const totalUsersQuery = createQueryBuilderMock({ count: 6 });
      const activeUsersQuery = createQueryBuilderMock({ count: 4 });
      const inactiveUsersQuery = createQueryBuilderMock({ count: 2 });
      const recentUsers = [{ id: "user-3" }];
      const recentUsersQuery = createQueryBuilderMock({ many: recentUsers });
      const topDepartmentsQuery = createQueryBuilderMock({
        rawMany: [
          { id: "dept-1", name: "Engineering", count: "6", manager: "Alice" },
        ],
      });

      mockUserRepo.createQueryBuilder
        .mockReturnValueOnce(resolveUserQuery)
        .mockReturnValueOnce(employeeCountQuery)
        .mockReturnValueOnce(managerCountQuery)
        .mockReturnValueOnce(totalUsersQuery)
        .mockReturnValueOnce(activeUsersQuery)
        .mockReturnValueOnce(inactiveUsersQuery)
        .mockReturnValueOnce(recentUsersQuery);
      mockDepartmentRepo.createQueryBuilder.mockReturnValue(topDepartmentsQuery);

      const result = await new DashboardService().getMetrics(
        "Manager",
        "manager@example.com",
        "cognito-sub-1"
      );

      expect(resolveUserQuery.where).toHaveBeenCalledWith(
        "user.cognitoSub = :cognitoSub",
        { cognitoSub: "cognito-sub-1" }
      );
      expect(employeeCountQuery.andWhere).toHaveBeenCalledWith(
        "user.departmentId = :departmentId",
        { departmentId: "dept-1" }
      );
      expect(topDepartmentsQuery.where).toHaveBeenCalledWith(
        "department.id = :departmentId",
        { departmentId: "dept-1" }
      );
      expect(mockDepartmentRepo.count).not.toHaveBeenCalled();
      expect(result.departmentCount).toBe(1);
      expect(result.recentUsers).toEqual(recentUsers);
      expect(result.topDepartments).toEqual([
        { id: "dept-1", name: "Engineering", count: 6, manager: "Alice" },
      ]);
    });

    it("throws when a non-admin user is not assigned to a department", async () => {
      const { DashboardService, mockUserRepo } = await loadDashboardService();
      const resolveUserQuery = createQueryBuilderMock({ one: null });

      mockUserRepo.createQueryBuilder.mockReturnValueOnce(resolveUserQuery);

      await expect(
        new DashboardService().getMetrics(
          "Employee",
          "employee@example.com",
          "cognito-sub-2"
        )
      ).rejects.toThrow("User is not assigned to any department");
    });
  });
}

{
  const mockDepartmentFindOne = jest.fn();
  const mockDepartmentCreate = jest.fn();
  const mockDepartmentSave = jest.fn();
  const mockDepartmentRemove = jest.fn();
  const mockDepartmentFind = jest.fn();
  const mockUserFindOne = jest.fn();
  const mockUserSave = jest.fn();

  const loadDepartmentService = async () => {
    jest.resetModules();

    const mockDepartmentRepo = {
      findOne: mockDepartmentFindOne,
      create: mockDepartmentCreate,
      save: mockDepartmentSave,
      remove: mockDepartmentRemove,
      find: mockDepartmentFind,
    };
    const mockUserRepo = {
      findOne: mockUserFindOne,
      save: mockUserSave,
    };

    jest.doMock("../config/data-source", () => ({
      AppDataSource: {
        getRepository: jest
          .fn()
          .mockReturnValueOnce(mockDepartmentRepo)
          .mockReturnValueOnce(mockUserRepo),
      },
    }));

    const { DepartmentService } = await import("../services/department.service");
    return { DepartmentService };
  };

  describe("DepartmentService", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.resetModules();
    });

    it("createDepartment throws when the department already exists", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockDepartmentFindOne.mockResolvedValue({ id: "dept-1" });

      await expect(
        new DepartmentService().createDepartment("Engineering")
      ).rejects.toThrow("Department already exists");
    });

    it("createDepartment creates and saves a new department", async () => {
      const { DepartmentService } = await loadDepartmentService();
      const department = { id: "dept-1", name: "Engineering" };
      mockDepartmentFindOne.mockResolvedValue(null);
      mockDepartmentCreate.mockReturnValue(department);
      mockDepartmentSave.mockResolvedValue(department);

      const result = await new DepartmentService().createDepartment(
        "Engineering"
      );

      expect(mockDepartmentCreate).toHaveBeenCalledWith({ name: "Engineering" });
      expect(result).toBe(department);
    });

    it("assignManager throws when the department does not exist", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockDepartmentFindOne.mockResolvedValue(null);

      await expect(
        new DepartmentService().assignManager("dept-1", "user-1")
      ).rejects.toThrow("Department not found");
    });

    it("assignManager throws when the user does not exist", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockDepartmentFindOne.mockResolvedValueOnce({
        id: "dept-1",
        manager: null,
      });
      mockUserFindOne.mockResolvedValue(null);

      await expect(
        new DepartmentService().assignManager("dept-1", "user-1")
      ).rejects.toThrow("User not found");
    });

    it("assignManager throws when the manager is assigned elsewhere", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockDepartmentFindOne
        .mockResolvedValueOnce({ id: "dept-1", manager: null })
        .mockResolvedValueOnce({ id: "dept-2", manager: { id: "user-1" } });
      mockUserFindOne.mockResolvedValue({ id: "user-1" });

      await expect(
        new DepartmentService().assignManager("dept-1", "user-1")
      ).rejects.toThrow("Manager is already assigned to another department");
    });

    it("assignManager throws when the department already has a different manager", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockDepartmentFindOne
        .mockResolvedValueOnce({
          id: "dept-1",
          manager: { id: "other-user" },
        })
        .mockResolvedValueOnce(null);
      mockUserFindOne.mockResolvedValue({ id: "user-1" });

      await expect(
        new DepartmentService().assignManager("dept-1", "user-1")
      ).rejects.toThrow("Department already has a manager");
    });

    it("assignManager saves the new manager assignment", async () => {
      const { DepartmentService } = await loadDepartmentService();
      const user = { id: "user-1" };
      const department: any = { id: "dept-1", manager: null };
      mockDepartmentFindOne
        .mockResolvedValueOnce(department)
        .mockResolvedValueOnce(null);
      mockUserFindOne.mockResolvedValue(user);
      mockDepartmentSave.mockResolvedValue({ ...department, manager: user });

      const result = await new DepartmentService().assignManager(
        "dept-1",
        "user-1"
      );

      expect(department.manager).toBe(user);
      expect(result).toEqual({ id: "dept-1", manager: user });
    });

    it("assignUserToDepartment throws when the user does not exist", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockUserFindOne.mockResolvedValue(null);

      await expect(
        new DepartmentService().assignUserToDepartment("user-1", "dept-1")
      ).rejects.toThrow("User Not Found");
    });

    it("assignUserToDepartment throws when the department does not exist", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockUserFindOne.mockResolvedValue({
        id: "user-1",
        role: { name: "Employee" },
      });
      mockDepartmentFindOne.mockResolvedValue(null);

      await expect(
        new DepartmentService().assignUserToDepartment("user-1", "dept-1")
      ).rejects.toThrow("Department Not Found");
    });

    it("assignUserToDepartment throws when a manager is assigned to another department", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockUserFindOne.mockResolvedValue({
        id: "user-1",
        role: { name: "Manager" },
      });
      mockDepartmentFindOne
        .mockResolvedValueOnce({ id: "dept-1", manager: null })
        .mockResolvedValueOnce({ id: "dept-2", manager: { id: "user-1" } });

      await expect(
        new DepartmentService().assignUserToDepartment("user-1", "dept-1")
      ).rejects.toThrow("Manager is already assigned to another department");
    });

    it("assignUserToDepartment throws when the target department has a different manager", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockUserFindOne.mockResolvedValue({
        id: "user-1",
        role: { name: "Manager" },
      });
      mockDepartmentFindOne
        .mockResolvedValueOnce({
          id: "dept-1",
          manager: { id: "other-user" },
        })
        .mockResolvedValueOnce(null);

      await expect(
        new DepartmentService().assignUserToDepartment("user-1", "dept-1")
      ).rejects.toThrow("Department already has a manager");
    });

    it("assignUserToDepartment updates the department manager when the user is a manager", async () => {
      const { DepartmentService } = await loadDepartmentService();
      const user: any = { id: "user-1", role: { name: "Manager" } };
      const department: any = { id: "dept-1", manager: null };
      mockUserFindOne.mockResolvedValue(user);
      mockDepartmentFindOne
        .mockResolvedValueOnce(department)
        .mockResolvedValueOnce(null);
      mockDepartmentSave.mockResolvedValue({ ...department, manager: user });
      mockUserSave.mockResolvedValue({ ...user, department });

      const result = await new DepartmentService().assignUserToDepartment(
        "user-1",
        "dept-1"
      );

      expect(mockDepartmentSave).toHaveBeenCalledWith(department);
      expect(user.department).toBe(department);
      expect(result).toEqual({ ...user, department });
    });

    it("assignUserToDepartment assigns a non-manager user without updating department manager", async () => {
      const { DepartmentService } = await loadDepartmentService();
      const user: any = { id: "user-1", role: { name: "Employee" } };
      const department = { id: "dept-1", manager: null };
      mockUserFindOne.mockResolvedValue(user);
      mockDepartmentFindOne.mockResolvedValue(department);
      mockUserSave.mockResolvedValue({ ...user, department });

      const result = await new DepartmentService().assignUserToDepartment(
        "user-1",
        "dept-1"
      );

      expect(mockDepartmentSave).not.toHaveBeenCalled();
      expect(result).toEqual({ ...user, department });
    });

    it("getDepartmentById throws when the department is not found", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockDepartmentFindOne.mockResolvedValue(null);

      await expect(
        new DepartmentService().getDepartmentById("dept-1")
      ).rejects.toThrow("Department not found");
    });

    it("getDepartmentById returns the department with relations", async () => {
      const { DepartmentService } = await loadDepartmentService();
      const department = { id: "dept-1" };
      mockDepartmentFindOne.mockResolvedValue(department);

      const result = await new DepartmentService().getDepartmentById("dept-1");

      expect(result).toBe(department);
    });

    it("updateDepartment throws when the department is not found", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockDepartmentFindOne.mockResolvedValue(null);

      await expect(
        new DepartmentService().updateDepartment("dept-1", "Engineering")
      ).rejects.toThrow("Department not Found");
    });

    it("updateDepartment trims and saves the new name", async () => {
      const { DepartmentService } = await loadDepartmentService();
      const department: any = { id: "dept-1", name: "Old" };
      mockDepartmentFindOne.mockResolvedValue(department);
      mockDepartmentSave.mockResolvedValue({
        id: "dept-1",
        name: "Engineering",
      });

      const result = await new DepartmentService().updateDepartment(
        "dept-1",
        " Engineering "
      );

      expect(department.name).toBe("Engineering");
      expect(result).toEqual({ id: "dept-1", name: "Engineering" });
    });

    it("deleteDepartment throws when the department is not found", async () => {
      const { DepartmentService } = await loadDepartmentService();
      mockDepartmentFindOne.mockResolvedValue(null);

      await expect(
        new DepartmentService().deleteDepartment("dept-1")
      ).rejects.toThrow("Department not Found");
    });

    it("deleteDepartment clears employee departments and removes the department", async () => {
      const { DepartmentService } = await loadDepartmentService();
      const department = {
        id: "dept-1",
        employees: [
          { id: "user-1", department: {} },
          { id: "user-2", department: {} },
        ],
      };
      mockDepartmentFindOne.mockResolvedValue(department);
      mockUserSave.mockResolvedValue(undefined);
      mockDepartmentRemove.mockResolvedValue(undefined);

      const result = await new DepartmentService().deleteDepartment("dept-1");

      expect(mockUserSave).toHaveBeenCalledTimes(2);
      expect(mockDepartmentRemove).toHaveBeenCalledWith(department);
      expect(result).toEqual({ message: "department deleted successfully" });
    });

    it("listDepartments returns departments with relations", async () => {
      const { DepartmentService } = await loadDepartmentService();
      const departments = [{ id: "dept-1" }];
      mockDepartmentFind.mockResolvedValue(departments);

      const result = await new DepartmentService().listDepartments();

      expect(mockDepartmentFind).toHaveBeenCalledWith({
        relations: ["manager", "employees"],
      });
      expect(result).toBe(departments);
    });
  });
}

{
  const mockRoleFindOne = jest.fn();
  const mockRoleCreate = jest.fn();
  const mockRoleSave = jest.fn();
  const mockRoleFind = jest.fn();
  const mockRoleRemove = jest.fn();
  const mockUserFindOne = jest.fn();
  const mockUserSave = jest.fn();

  const loadRolesService = async () => {
    jest.resetModules();

    const mockRoleRepository = {
      findOne: mockRoleFindOne,
      create: mockRoleCreate,
      save: mockRoleSave,
      find: mockRoleFind,
      remove: mockRoleRemove,
    };
    const mockUserRepository = {
      findOne: mockUserFindOne,
      save: mockUserSave,
    };

    jest.doMock("../config/data-source", () => ({
      AppDataSource: {
        getRepository: jest
          .fn()
          .mockReturnValueOnce(mockRoleRepository)
          .mockReturnValueOnce(mockUserRepository),
      },
    }));

    return import("../services/roles.service");
  };

  describe("roles.service", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.resetModules();
    });

    it("createRole throws when the role already exists", async () => {
      const service = await loadRolesService();
      mockRoleFindOne.mockResolvedValue({ id: "role-1" });

      await expect(service.createRole("Admin")).rejects.toThrow(
        "Role already exists"
      );
    });

    it("createRole creates and saves a new role", async () => {
      const service = await loadRolesService();
      const role = { id: "role-1", name: "Admin" };
      mockRoleFindOne.mockResolvedValue(null);
      mockRoleCreate.mockReturnValue(role);
      mockRoleSave.mockResolvedValue(role);

      const result = await service.createRole("Admin");

      expect(mockRoleCreate).toHaveBeenCalledWith({ name: "Admin" });
      expect(result).toBe(role);
    });

    it("findAllRoles returns all roles", async () => {
      const service = await loadRolesService();
      mockRoleFind.mockResolvedValue([{ id: "role-1" }]);

      const result = await service.findAllRoles();

      expect(result).toEqual([{ id: "role-1" }]);
    });

    it("findRoleById throws when the role is not found", async () => {
      const service = await loadRolesService();
      mockRoleFindOne.mockResolvedValue(null);

      await expect(service.findRoleById("role-1")).rejects.toThrow(
        "Role not found"
      );
    });

    it("findRoleById returns the role", async () => {
      const service = await loadRolesService();
      const role = { id: "role-1" };
      mockRoleFindOne.mockResolvedValue(role);

      const result = await service.findRoleById("role-1");

      expect(result).toBe(role);
    });

    it("deleteRole removes the role and returns a message", async () => {
      const service = await loadRolesService();
      const role = { id: "role-1" };
      mockRoleFindOne.mockResolvedValue(role);
      mockRoleRemove.mockResolvedValue(undefined);

      const result = await service.deleteRole("role-1");

      expect(mockRoleRemove).toHaveBeenCalledWith(role);
      expect(result).toEqual({ message: "Role deleted successfully" });
    });

    it("assignRoleToUser throws when the user is not found", async () => {
      const service = await loadRolesService();
      mockUserFindOne.mockResolvedValue(null);

      await expect(service.assignRoleToUser("user-1", "Admin")).rejects.toThrow(
        "User not found"
      );
    });

    it("assignRoleToUser throws when the role is not found", async () => {
      const service = await loadRolesService();
      mockUserFindOne.mockResolvedValue({ id: "user-1", role: null });
      mockRoleFindOne.mockResolvedValue(null);

      await expect(service.assignRoleToUser("user-1", "Admin")).rejects.toThrow(
        "Role not found"
      );
    });

    it("assignRoleToUser throws when the user already has the role", async () => {
      const service = await loadRolesService();
      mockUserFindOne.mockResolvedValue({
        id: "user-1",
        role: { id: "role-1" },
      });
      mockRoleFindOne.mockResolvedValue({ id: "role-1", name: "Admin" });

      await expect(service.assignRoleToUser("user-1", "Admin")).rejects.toThrow(
        "User already has this role"
      );
    });

    it("assignRoleToUser saves the updated user role", async () => {
      const service = await loadRolesService();
      const role = { id: "role-2", name: "Admin" };
      const user: any = { id: "user-1", role: { id: "role-1" } };
      mockUserFindOne.mockResolvedValue(user);
      mockRoleFindOne.mockResolvedValue(role);
      mockUserSave.mockResolvedValue({ ...user, role });

      const result = await service.assignRoleToUser("user-1", "Admin");

      expect(result).toEqual({ ...user, role });
    });
  });
}

{
  const mockFindOne = jest.fn();
  const mockCreate = jest.fn();
  const mockSave = jest.fn();
  const mockFind = jest.fn();
  const mockMerge = jest.fn();
  const mockRemove = jest.fn();

  const loadUserService = async () => {
    jest.resetModules();

    const mockUserRepo = {
      findOne: mockFindOne,
      create: mockCreate,
      save: mockSave,
      find: mockFind,
      merge: mockMerge,
      remove: mockRemove,
    };
    const mockRoleRepo = {
      findOne: jest.fn(),
    };

    jest.doMock("../config/data-source", () => ({
      AppDataSource: {
        getRepository: jest
          .fn()
          .mockReturnValueOnce(mockUserRepo)
          .mockReturnValueOnce(mockRoleRepo),
      },
    }));

    const { UserService } = await import("../services/user.service");

    return { UserService, mockRoleRepo };
  };

  describe("UserService", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.resetModules();
    });

    it("create throws when a user with the same email or username already exists", async () => {
      const { UserService } = await loadUserService();
      mockFindOne.mockResolvedValue({ id: "existing-user" });

      await expect(
        new UserService().create({
          email: "jane@example.com",
          username: "jane",
          password: "secret123",
        })
      ).rejects.toThrow("User already exists");
    });

    it("create throws when the default employee role is missing", async () => {
      const { UserService, mockRoleRepo } = await loadUserService();
      mockFindOne.mockResolvedValue(null);
      mockRoleRepo.findOne.mockResolvedValue(null);

      await expect(
        new UserService().create({
          email: "jane@example.com",
          username: "jane",
          password: "secret123",
        })
      ).rejects.toThrow("Default role not found. Seed roles first.");
    });

    it("create saves the user without storing a local password", async () => {
      const { UserService, mockRoleRepo } = await loadUserService();
      const employeeRole = { id: "role-1", name: "Employee" };
      const userInput = {
        email: "jane@example.com",
        username: "jane",
      };
      const createdUser = { id: "user-1", ...userInput, role: employeeRole };

      mockFindOne.mockResolvedValue(null);
      mockRoleRepo.findOne.mockResolvedValue(employeeRole);
      mockCreate.mockReturnValue(createdUser);
      mockSave.mockResolvedValue(createdUser);

      const result = await new UserService().create({ ...userInput });

      expect(mockCreate).toHaveBeenCalledWith({
        email: "jane@example.com",
        username: "jane",
        role: employeeRole,
      });
      expect(mockSave).toHaveBeenCalledWith(createdUser);
      expect(result).toBe(createdUser);
    });

    it("findAll returns users with role and department relations", async () => {
      const { UserService } = await loadUserService();
      const users = [{ id: "user-1" }];
      mockFind.mockResolvedValue(users);

      const result = await new UserService().findAll();

      expect(mockFind).toHaveBeenCalledWith({
        relations: ["role", "department"],
      });
      expect(result).toBe(users);
    });

    it("findOne throws when the user is not found", async () => {
      const { UserService } = await loadUserService();
      mockFindOne.mockResolvedValue(null);

      await expect(new UserService().findOne("user-1")).rejects.toThrow(
        "User not found"
      );
    });

    it("findOne returns the user with relations", async () => {
      const { UserService } = await loadUserService();
      const user = { id: "user-1" };
      mockFindOne.mockResolvedValue(user);

      const result = await new UserService().findOne("user-1");

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { id: "user-1" },
        relations: ["role", "department"],
      });
      expect(result).toBe(user);
    });

    it("update drops password changes and saves the remaining fields", async () => {
      const { UserService } = await loadUserService();
      const user = {
        id: "user-1",
        username: "jane",
      };

      mockFindOne.mockResolvedValue(user);
      mockMerge.mockImplementation((target, data) => Object.assign(target, data));
      mockSave.mockResolvedValue({
        ...user,
        username: "jane-2",
      });

      const result = await new UserService().update("user-1", {
        password: "secret123",
        username: "jane-2",
      });

      expect(mockMerge).toHaveBeenCalledWith(user, {
        username: "jane-2",
      });
      expect(mockSave).toHaveBeenCalledWith(user);
      expect(result).toEqual({
        id: "user-1",
        username: "jane-2",
      });
    });

    it("update saves without hashing when no password is provided", async () => {
      const { UserService } = await loadUserService();
      const user = {
        id: "user-1",
        username: "jane",
      };

      mockFindOne.mockResolvedValue(user);
      mockMerge.mockImplementation((target, data) => Object.assign(target, data));
      mockSave.mockResolvedValue({ ...user, username: "updated-name" });

      const result = await new UserService().update("user-1", {
        username: "updated-name",
      });

      expect(mockMerge).toHaveBeenCalledWith(user, {
        username: "updated-name",
      });
      expect(result).toEqual({
        id: "user-1",
        username: "updated-name",
      });
    });

    it("remove deletes the user and returns a success message", async () => {
      const { UserService } = await loadUserService();
      const user: any = {
        id: "user-1",
        isActive: true,
        role: { id: "role-1", name: "Employee" },
        department: { id: "dept-1" },
      };
      mockFindOne.mockResolvedValue(user);
      mockSave.mockResolvedValue({
        ...user,
        isActive: false,
        role: null,
        department: null,
      });

      const result = await new UserService().remove("user-1");

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "user-1",
          isActive: false,
          role: null,
          department: null,
        })
      );
      expect(result).toEqual({ message: "User deleted successfully" });
    });
  });
}
