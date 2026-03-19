export {};

{
  const mockFindOne = jest.fn();
  const mockCreate = jest.fn();
  const mockSave = jest.fn();
  const mockRoleWhere = jest.fn();
  const mockRoleGetOne = jest.fn();
  const mockRegisterCognitoUser = jest.fn();
  const mockConfirmCognitoUserSignUp = jest.fn();

  const createResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const loadAuthController = async () => {
    jest.resetModules();

    jest.doMock("../config/data-source", () => ({
      AppDataSource: {
        getRepository: jest.fn((entity: { name?: string }) => {
          if (entity?.name === "User") {
            return {
              findOne: mockFindOne,
              create: mockCreate,
              save: mockSave,
            };
          }

          if (entity?.name === "Role") {
            return {
              createQueryBuilder: jest.fn(() => ({
                where: mockRoleWhere.mockReturnThis(),
                getOne: mockRoleGetOne,
              })),
            };
          }

          return {};
        }),
      },
    }));

    jest.doMock("../services/cognito.service", () => ({
      registerCognitoUser: mockRegisterCognitoUser,
      confirmCognitoUserSignUp: mockConfirmCognitoUserSignUp,
    }));

    return import("../controllers/auth.controller");
  };

  describe("auth.controller", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.resetModules();
    });

    it("signUp returns 400 for invalid input", async () => {
      const { signUp } = await loadAuthController();
      const req: any = {
        body: {
          email: "bad-email",
          password: "123",
        },
      };
      const res = createResponse();

      await signUp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid request",
        })
      );
    });

    it("signUp returns 201 on success", async () => {
      const { signUp } = await loadAuthController();
      const employeeRole = { id: "role-1", name: "Employee" };
      const createdUser = { id: "user-1", email: "jane@example.com" };
      const req: any = {
        body: {
          email: "jane@example.com",
          password: "secret123",
          username: "jane",
          gender: "female",
        },
      };
      const res = createResponse();
      mockFindOne.mockResolvedValue(null);
      mockRoleGetOne.mockResolvedValue(employeeRole);
      mockRegisterCognitoUser.mockResolvedValue(undefined);
      mockCreate.mockReturnValue(createdUser);
      mockSave.mockResolvedValue(createdUser);

      await signUp(req, res);

      expect(mockRegisterCognitoUser).toHaveBeenCalledWith(
        "jane@example.com",
        "secret123",
        {
          gender: "female",
          formattedName: "jane",
        }
      );
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "jane@example.com",
          username: "jane",
          password: "COGNITO_MANAGED",
          role: employeeRole,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Signup successful. Please verify your email before logging in.",
      });
    });

    it("signUp returns 400 when Cognito signup fails", async () => {
      const { signUp } = await loadAuthController();
      const employeeRole = { id: "role-1", name: "Employee" };
      const req: any = {
        body: {
          email: "jane@example.com",
          password: "secret123",
          username: "jane",
          gender: "female",
        },
      };
      const res = createResponse();
      mockFindOne.mockResolvedValue(null);
      mockRoleGetOne.mockResolvedValue(employeeRole);
      mockRegisterCognitoUser.mockRejectedValue(new Error("User already exists"));

      await signUp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "User already exists",
      });
    });

    it("confirmSignUp returns 400 for invalid input", async () => {
      const { confirmSignUp } = await loadAuthController();
      const req: any = {
        body: {
          email: "bad-email",
          code: "",
        },
      };
      const res = createResponse();

      await confirmSignUp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid request",
        })
      );
    });

    it("confirmSignUp returns 200 on success", async () => {
      const { confirmSignUp } = await loadAuthController();
      const req: any = {
        body: {
          email: "jane@example.com",
          code: "123456",
        },
      };
      const res = createResponse();
      mockConfirmCognitoUserSignUp.mockResolvedValue(undefined);

      await confirmSignUp(req, res);

      expect(mockConfirmCognitoUserSignUp).toHaveBeenCalledWith(
        "jane@example.com",
        "123456"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email verified successfully. You can now sign in.",
      });
    });

    it("syncProfile returns 400 when the token has no email", async () => {
      const { syncProfile } = await loadAuthController();
      const req: any = { user: {} };
      const res = createResponse();

      await syncProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Email is required" });
    });

    it("syncProfile creates the local user when missing", async () => {
      const { syncProfile } = await loadAuthController();
      const req: any = {
        user: {
          email: "jane@example.com",
          name: "Jane Doe",
          "cognito:groups": ["Manager"],
        },
      };
      const res = createResponse();
      const managerRole = { id: "role-2", name: "Manager" };
      const createdUser = { id: "user-1", email: "jane@example.com" };
      const syncedUser = {
        id: "user-1",
        email: "jane@example.com",
        username: "Jane Doe",
        role: managerRole,
      };

      mockRoleGetOne.mockResolvedValue(managerRole);
      mockFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(syncedUser);
      mockCreate.mockReturnValue(createdUser);
      mockSave.mockResolvedValue(createdUser);

      await syncProfile(req, res);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "jane@example.com",
          username: "Jane Doe",
          password: "COGNITO_MANAGED",
          role: managerRole,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(syncedUser);
    });

    it("syncProfile updates an existing user's role", async () => {
      const { syncProfile } = await loadAuthController();
      const req: any = {
        user: {
          email: "jane@example.com",
          name: "Jane Doe",
          "cognito:groups": ["Manager"],
        },
      };
      const res = createResponse();
      const employeeRole = { id: "role-1", name: "Employee" };
      const managerRole = { id: "role-2", name: "Manager" };
      const existingUser = {
        id: "user-1",
        email: "jane@example.com",
        username: "Jane Doe",
        role: employeeRole,
      };
      const syncedUser = {
        ...existingUser,
        role: managerRole,
      };

      mockRoleGetOne.mockResolvedValue(managerRole);
      mockFindOne
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(syncedUser);
      mockSave.mockResolvedValue(existingUser);

      await syncProfile(req, res);

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          role: managerRole,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(syncedUser);
    });
  });
}

{
  const mockGetMetrics = jest.fn();

  const createResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const loadDashboardController = async () => {
    jest.resetModules();

    jest.doMock("../services/dashboard.service", () => ({
      DashboardService: jest.fn().mockImplementation(() => ({
        getMetrics: mockGetMetrics,
      })),
    }));

    return import("../controllers/dashboard.controller");
  };

  describe("dashboard.controller", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.resetModules();
    });

    it("returns 403 when role or username is missing", async () => {
      const { getDashboardMetrics } = await loadDashboardController();
      const req: any = { user: {} };
      const res = createResponse();

      await getDashboardMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    });

    it("uses req.user.role when present and returns metrics", async () => {
      const { getDashboardMetrics } = await loadDashboardController();
      const req: any = {
        user: {
          role: "Admin",
          username: "jane",
          email: "jane@example.com",
        },
      };
      const res = createResponse();
      const metrics = { totalUsers: 10 };
      mockGetMetrics.mockResolvedValue(metrics);

      await getDashboardMetrics(req, res);

      expect(mockGetMetrics).toHaveBeenCalledWith(
        "Admin",
        "jane",
        "jane@example.com"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(metrics);
    });

    it("falls back to the first Cognito group when role is not present", async () => {
      const { getDashboardMetrics } = await loadDashboardController();
      const req: any = {
        user: {
          username: "jane",
          email: "jane@example.com",
          "cognito:groups": ["Manager"],
        },
      };
      const res = createResponse();
      mockGetMetrics.mockResolvedValue({ totalUsers: 4 });

      await getDashboardMetrics(req, res);

      expect(mockGetMetrics).toHaveBeenCalledWith(
        "Manager",
        "jane",
        "jane@example.com"
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 when the service reports the user is not assigned", async () => {
      const { getDashboardMetrics } = await loadDashboardController();
      const req: any = {
        user: {
          role: "Employee",
          username: "jane",
        },
      };
      const res = createResponse();
      mockGetMetrics.mockRejectedValue(
        new Error("User is not assigned to any department")
      );

      await getDashboardMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "User is not assigned to any department",
      });
    });

    it("returns 500 for other service failures", async () => {
      const { getDashboardMetrics } = await loadDashboardController();
      const req: any = {
        user: {
          role: "Admin",
          username: "jane",
        },
      };
      const res = createResponse();
      mockGetMetrics.mockRejectedValue(new Error("Unexpected failure"));

      await getDashboardMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Unexpected failure" });
    });
  });
}

{
  const mockCreateDepartment = jest.fn();
  const mockAssignManager = jest.fn();
  const mockAssignUserToDepartment = jest.fn();
  const mockListDepartments = jest.fn();
  const mockGetDepartmentById = jest.fn();
  const mockUpdateDepartment = jest.fn();
  const mockDeleteDepartment = jest.fn();

  const createResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const loadDepartmentController = async () => {
    jest.resetModules();

    jest.doMock("../services/department.service", () => ({
      DepartmentService: jest.fn().mockImplementation(() => ({
        createDepartment: mockCreateDepartment,
        assignManager: mockAssignManager,
        assignUserToDepartment: mockAssignUserToDepartment,
        listDepartments: mockListDepartments,
        getDepartmentById: mockGetDepartmentById,
        updateDepartment: mockUpdateDepartment,
        deleteDepartment: mockDeleteDepartment,
      })),
    }));

    return import("../controllers/department.controller");
  };

  describe("department.controller", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.resetModules();
    });

    it("createDepartment returns 400 for invalid input", async () => {
      const { createDepartment } = await loadDepartmentController();
      const res = createResponse();

      await createDepartment({ body: { name: "" } } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("createDepartment returns 201 on success", async () => {
      const { createDepartment } = await loadDepartmentController();
      const res = createResponse();
      mockCreateDepartment.mockResolvedValue({ id: "dept-1" });

      await createDepartment({ body: { name: "Engineering" } } as any, res);

      expect(mockCreateDepartment).toHaveBeenCalledWith("Engineering");
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("assignManager returns 400 for invalid input", async () => {
      const { assignManager } = await loadDepartmentController();
      const res = createResponse();

      await assignManager({ body: { departmentId: "" } } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("assignManager returns 200 on success", async () => {
      const { assignManager } = await loadDepartmentController();
      const res = createResponse();
      mockAssignManager.mockResolvedValue({ id: "dept-1" });

      await assignManager(
        { body: { departmentId: "dept-1", userId: "user-1" } } as any,
        res
      );

      expect(mockAssignManager).toHaveBeenCalledWith("dept-1", "user-1");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("assignUserToDepartment returns 400 for invalid input", async () => {
      const { assignUserToDepartment } = await loadDepartmentController();
      const res = createResponse();

      await assignUserToDepartment({ body: { userId: "" } } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("assignUserToDepartment returns 200 on success", async () => {
      const { assignUserToDepartment } = await loadDepartmentController();
      const res = createResponse();
      mockAssignUserToDepartment.mockResolvedValue({ id: "user-1" });

      await assignUserToDepartment(
        { body: { userId: "user-1", departmentId: "dept-1" } } as any,
        res
      );

      expect(mockAssignUserToDepartment).toHaveBeenCalledWith(
        "user-1",
        "dept-1"
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("getDepartments returns 200 on success", async () => {
      const { getDepartments } = await loadDepartmentController();
      const res = createResponse();
      mockListDepartments.mockResolvedValue([{ id: "dept-1" }]);

      await getDepartments({} as any, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("getDepartments returns 500 on failure", async () => {
      const { getDepartments } = await loadDepartmentController();
      const res = createResponse();
      mockListDepartments.mockRejectedValue(new Error("failed"));

      await getDepartments({} as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "failed" });
    });

    it("getDepartmentById returns 400 for invalid params", async () => {
      const { getDepartmentById } = await loadDepartmentController();
      const res = createResponse();

      await getDepartmentById({ params: { id: "" } } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("getDepartmentById returns 200 on success", async () => {
      const { getDepartmentById } = await loadDepartmentController();
      const res = createResponse();
      mockGetDepartmentById.mockResolvedValue({ id: "dept-1" });

      await getDepartmentById({ params: { id: "dept-1" } } as any, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("updateDepartment returns 400 for invalid params", async () => {
      const { updateDepartment } = await loadDepartmentController();
      const res = createResponse();

      await updateDepartment(
        { params: { id: "" }, body: { name: "Eng" } } as any,
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("updateDepartment returns 400 for invalid body", async () => {
      const { updateDepartment } = await loadDepartmentController();
      const res = createResponse();

      await updateDepartment(
        { params: { id: "dept-1" }, body: { name: "" } } as any,
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("updateDepartment returns 200 on success", async () => {
      const { updateDepartment } = await loadDepartmentController();
      const res = createResponse();
      mockUpdateDepartment.mockResolvedValue({ id: "dept-1" });

      await updateDepartment(
        { params: { id: "dept-1" }, body: { name: "Eng" } } as any,
        res
      );

      expect(mockUpdateDepartment).toHaveBeenCalledWith("dept-1", "Eng");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deleteDepartment returns 400 for invalid params", async () => {
      const { deleteDepartment } = await loadDepartmentController();
      const res = createResponse();

      await deleteDepartment({ params: { id: "" } } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deleteDepartment returns 200 on success", async () => {
      const { deleteDepartment } = await loadDepartmentController();
      const res = createResponse();
      mockDeleteDepartment.mockResolvedValue({ message: "ok" });

      await deleteDepartment({ params: { id: "dept-1" } } as any, res);

      expect(mockDeleteDepartment).toHaveBeenCalledWith("dept-1");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
}

{
  const mockCreateRole = jest.fn();
  const mockFindAllRoles = jest.fn();
  const mockFindRoleById = jest.fn();
  const mockDeleteRole = jest.fn();

  const createResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const loadRolesController = async () => {
    jest.resetModules();

    jest.doMock("../services/roles.service", () => ({
      createRole: mockCreateRole,
      findAllRoles: mockFindAllRoles,
      findRoleById: mockFindRoleById,
      deleteRole: mockDeleteRole,
    }));

    return import("../controllers/roles.controller");
  };

  describe("roles.controller", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.resetModules();
    });

    it("createRole returns 400 for invalid input", async () => {
      const { createRole } = await loadRolesController();
      const res = createResponse();

      await createRole({ body: { name: "" } } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("createRole returns 201 on success", async () => {
      const { createRole } = await loadRolesController();
      const res = createResponse();
      mockCreateRole.mockResolvedValue({ id: "role-1" });

      await createRole({ body: { name: "Admin" } } as any, res);

      expect(mockCreateRole).toHaveBeenCalledWith("Admin");
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("getRoles returns roles on success", async () => {
      const { getRoles } = await loadRolesController();
      const res = createResponse();
      mockFindAllRoles.mockResolvedValue([{ id: "role-1" }]);

      await getRoles({} as any, res);

      expect(res.json).toHaveBeenCalledWith([{ id: "role-1" }]);
    });

    it("getRoles returns 500 on failure", async () => {
      const { getRoles } = await loadRolesController();
      const res = createResponse();
      mockFindAllRoles.mockRejectedValue(new Error("failed"));

      await getRoles({} as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("getRole returns 400 for invalid params", async () => {
      const { getRole } = await loadRolesController();
      const res = createResponse();

      await getRole({ params: { id: "" } } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("getRole returns the role on success", async () => {
      const { getRole } = await loadRolesController();
      const res = createResponse();
      mockFindRoleById.mockResolvedValue({ id: "role-1" });

      await getRole({ params: { id: "role-1" } } as any, res);

      expect(res.json).toHaveBeenCalledWith({ id: "role-1" });
    });

    it("deleteRole returns 400 for invalid params", async () => {
      const { deleteRole } = await loadRolesController();
      const res = createResponse();

      await deleteRole({ params: { id: "" } } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deleteRole returns the service result on success", async () => {
      const { deleteRole } = await loadRolesController();
      const res = createResponse();
      mockDeleteRole.mockResolvedValue({ message: "ok" });

      await deleteRole({ params: { id: "role-1" } } as any, res);

      expect(res.json).toHaveBeenCalledWith({ message: "ok" });
    });
  });
}

{
  const mockCreate = jest.fn();
  const mockFindOneService = jest.fn();
  const mockUserRepoFindOne = jest.fn();
  const mockUserRepoRemove = jest.fn();
  const mockUserRepoSave = jest.fn();
  const mockUserRepoCreateQueryBuilder = jest.fn();
  const mockRoleQueryBuilderWhere = jest.fn();
  const mockRoleQueryBuilderGetOne = jest.fn();
  const mockDepartmentRepoFindOne = jest.fn();
  const mockDepartmentRepoSave = jest.fn();
  const mockCreateCognitoUser = jest.fn();
  const mockDeleteCognitoUser = jest.fn();
  const mockSetCognitoUserRole = jest.fn();

  const createResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const createUserQueryBuilder = (result: unknown[] = []) => {
    const builder: any = {};
    builder.leftJoinAndSelect = jest.fn().mockReturnValue(builder);
    builder.innerJoinAndSelect = jest.fn().mockReturnValue(builder);
    builder.where = jest.fn().mockReturnValue(builder);
    builder.andWhere = jest.fn().mockReturnValue(builder);
    builder.getMany = jest.fn().mockResolvedValue(result);
    builder.getOne = jest.fn().mockResolvedValue(null);
    return builder;
  };

  const loadUserController = async () => {
    jest.resetModules();

    jest.doMock("../services/user.service", () => ({
      UserService: jest.fn().mockImplementation(() => ({
        create: mockCreate,
        findOne: mockFindOneService,
      })),
    }));

    jest.doMock("../config/data-source", () => ({
      AppDataSource: {
        getRepository: jest.fn((entity: { name?: string }) => {
          if (entity?.name === "User") {
            return {
              findOne: mockUserRepoFindOne,
              remove: mockUserRepoRemove,
              save: mockUserRepoSave,
              createQueryBuilder: mockUserRepoCreateQueryBuilder,
            };
          }

          if (entity?.name === "Role") {
            return {
              createQueryBuilder: jest.fn(() => ({
                where: mockRoleQueryBuilderWhere.mockReturnThis(),
                getOne: mockRoleQueryBuilderGetOne,
              })),
            };
          }

          if (entity?.name === "Department") {
            return {
              findOne: mockDepartmentRepoFindOne,
              save: mockDepartmentRepoSave,
            };
          }

          return {};
        }),
      },
    }));

    jest.doMock("../services/cognito.service", () => ({
      createCognitoUser: mockCreateCognitoUser,
      deleteCognitoUser: mockDeleteCognitoUser,
      setCognitoUserRole: mockSetCognitoUserRole,
    }));

    return import("../controllers/user.controller");
  };

  describe("user.controller", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.resetModules();
    });

    it("createUser returns 400 for invalid input", async () => {
      const { createUser } = await loadUserController();
      const req: any = {
        body: {
          username: "",
          email: "bad-email",
          password: "123",
        },
      };
      const res = createResponse();

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid request",
        })
      );
    });

    it("createUser returns 201 on success", async () => {
      const { createUser } = await loadUserController();
      const createdUser = { id: "user-1", username: "jane" };
      const req: any = {
        body: {
          username: "jane",
          email: "jane@example.com",
          password: "secret123",
        },
      };
      const res = createResponse();
      mockCreateCognitoUser.mockResolvedValue(undefined);
      mockCreate.mockResolvedValue(createdUser);

      await createUser(req, res);

      expect(mockCreateCognitoUser).toHaveBeenCalledWith(
        "jane@example.com",
        "Employee",
        expect.objectContaining({
          formattedName: "jane",
          temporaryPassword: "secret123",
        })
      );
      expect(mockCreate).toHaveBeenCalledWith({
        username: "jane",
        email: "jane@example.com",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdUser);
    });

    it("deleteUser returns 404 when the user does not exist", async () => {
      const { deleteUser } = await loadUserController();
      const req: any = {
        params: { id: "user-1" },
      };
      const res = createResponse();
      mockUserRepoFindOne.mockResolvedValue(null);

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("deleteUser removes the user and returns 200", async () => {
      const { deleteUser } = await loadUserController();
      const user = { id: "user-1", email: "jane@example.com" };
      const req: any = {
        params: { id: "user-1" },
      };
      const res = createResponse();
      mockUserRepoFindOne.mockResolvedValue(user);
      mockDeleteCognitoUser.mockResolvedValue(undefined);
      mockUserRepoRemove.mockResolvedValue(undefined);

      await deleteUser(req, res);

      expect(mockDeleteCognitoUser).toHaveBeenCalledWith("jane@example.com");
      expect(mockUserRepoRemove).toHaveBeenCalledWith(user);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "User deleted successfully",
      });
    });

    it("getUsers returns 403 for non-admin users", async () => {
      const { getUsers } = await loadUserController();
      const req: any = {
        user: {
          role: "Employee",
        },
        query: {},
      };
      const res = createResponse();

      await getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    });

    it("getUsers returns users for admins", async () => {
      const { getUsers } = await loadUserController();
      const users = [{ id: "user-2" }];
      const queryBuilder = createUserQueryBuilder(users);
      const req: any = {
        user: {
          role: "Admin",
          id: "user-1",
        },
        query: {
          search: "jo",
          name: "john",
          email: "john@example.com",
        },
      };
      const res = createResponse();
      mockUserRepoCreateQueryBuilder.mockReturnValue(queryBuilder);

      await getUsers(req, res);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "user.id != :requesterId",
        { requesterId: "user-1" }
      );
      expect(queryBuilder.getMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(users);
    });

    it("getUsersByDepartment returns 401 without a user identity", async () => {
      const { getUsersByDepartment } = await loadUserController();
      const req: any = {
        user: {},
        query: {},
      };
      const res = createResponse();

      await getUsersByDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("getUsersByDepartment returns 400 when the current user has no department", async () => {
      const { getUsersByDepartment } = await loadUserController();
      const req: any = {
        user: {
          id: "user-1",
          email: "jane@example.com",
        },
        query: {},
      };
      const res = createResponse();
      mockUserRepoFindOne.mockResolvedValue({ department: null });

      await getUsersByDepartment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "User is not assigned to any department",
      });
    });

    it("getUsersByDepartment returns department users", async () => {
      const { getUsersByDepartment } = await loadUserController();
      const users = [{ id: "user-2" }];
      const queryBuilder = createUserQueryBuilder(users);
      const req: any = {
        user: {
          id: "user-1",
          email: "manager@example.com",
        },
        query: {
          search: "jo",
        },
      };
      const res = createResponse();
      mockUserRepoFindOne.mockResolvedValue({
        department: { id: "dept-1" },
      });
      mockUserRepoCreateQueryBuilder.mockReturnValue(queryBuilder);

      await getUsersByDepartment(req, res);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        "department.id = :departmentId",
        { departmentId: "dept-1" }
      );
      expect(res.json).toHaveBeenCalledWith(users);
    });

    it("getUser returns 403 when the requester is neither admin nor self", async () => {
      const { getUser } = await loadUserController();
      const req: any = {
        params: { id: "user-2" },
        user: {
          id: "user-1",
          role: "Employee",
        },
      };
      const res = createResponse();

      await getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    });

    it("getUser returns the user for self access", async () => {
      const { getUser } = await loadUserController();
      const req: any = {
        params: { id: "user-1" },
        user: {
          id: "user-1",
          role: "Employee",
        },
      };
      const res = createResponse();
      const user = { id: "user-1" };
      mockFindOneService.mockResolvedValue(user);

      await getUser(req, res);

      expect(mockFindOneService).toHaveBeenCalledWith("user-1");
      expect(res.json).toHaveBeenCalledWith(user);
    });

    it("updateUser returns 404 when the user does not exist", async () => {
      const { updateUser } = await loadUserController();
      const req: any = {
        params: { id: "user-1" },
        body: {
          username: "jane",
        },
      };
      const res = createResponse();
      mockUserRepoFindOne.mockResolvedValue(null);

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("updateUser updates a user and returns the refreshed entity", async () => {
      const { updateUser } = await loadUserController();
      const existingUser: any = {
        id: "user-1",
        username: "old-name",
        email: "old@example.com",
        isActive: true,
        role: { name: "Employee" },
        department: { id: "dept-old" },
      };
      const updatedUser = {
        id: "user-1",
        username: "new-name",
        email: "old@example.com",
        isActive: false,
        role: { name: "Employee" },
        department: { id: "dept-1" },
      };
      const req: any = {
        params: { id: "user-1" },
        body: {
          username: "new-name",
          email: "old@example.com",
          role: "Employee",
          isActive: false,
          departmentId: "dept-1",
        },
      };
      const res = createResponse();

      mockUserRepoFindOne
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(updatedUser);
      mockRoleQueryBuilderGetOne.mockResolvedValue({
        id: "role-1",
        name: "Employee",
      });
      mockDepartmentRepoFindOne.mockResolvedValue({
        id: "dept-1",
        name: "Engineering",
      });
      mockSetCognitoUserRole.mockResolvedValue(undefined);
      mockUserRepoSave.mockResolvedValue(existingUser);

      await updateUser(req, res);

      expect(mockSetCognitoUserRole).toHaveBeenCalledWith(
        "old@example.com",
        "Employee"
      );
      expect(mockUserRepoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "new-name",
          email: "old@example.com",
          isActive: false,
        })
      );
      expect(res.json).toHaveBeenCalledWith(updatedUser);
    });
  });
}
