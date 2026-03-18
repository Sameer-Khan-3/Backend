const mockSend = jest.fn();
const mockCognitoClient = jest.fn(() => ({ send: mockSend }));

jest.mock("@aws-sdk/client-cognito-identity-provider", () => {
  class AdminDeleteUserCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class AdminListGroupsForUserCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class AdminCreateUserCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class AdminAddUserToGroupCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class AdminRemoveUserFromGroupCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class AdminSetUserPasswordCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class SignUpCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class ConfirmSignUpCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    CognitoIdentityProviderClient: mockCognitoClient,
    AdminDeleteUserCommand,
    AdminListGroupsForUserCommand,
    AdminCreateUserCommand,
    AdminAddUserToGroupCommand,
    AdminRemoveUserFromGroupCommand,
    AdminSetUserPasswordCommand,
    SignUpCommand,
    ConfirmSignUpCommand,
  };
});

import {
  confirmCognitoUserSignUp,
  createCognitoUser,
  deleteCognitoUser,
  registerCognitoUser,
  setCognitoUserPassword,
  setCognitoUserRole,
} from "../services/cognito.service";

describe("cognito.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.COGNITO_USER_POOL_ID = "pool-123";
    process.env.COGNITO_CLIENT_ID = "client-123";
  });

  it("creates a Cognito user and assigns the requested group", async () => {
    mockSend.mockResolvedValue({});

    await createCognitoUser("jane@example.com", "Manager", {
      gender: "female",
      formattedName: "Jane Doe",
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend.mock.calls[0][0].input).toEqual({
      UserPoolId: "pool-123",
      Username: "jane@example.com",
      UserAttributes: [
        { Name: "email", Value: "jane@example.com" },
        { Name: "email_verified", Value: "true" },
        { Name: "gender", Value: "female" },
        { Name: "name", Value: "Jane Doe" },
      ],
      TemporaryPassword: "Temp@1234",
      MessageAction: "SUPPRESS",
    });
    expect(mockSend.mock.calls[1][0].input).toEqual({
      UserPoolId: "pool-123",
      Username: "jane@example.com",
      GroupName: "Manager",
    });
  });

  it("registers a public Cognito user for email verification", async () => {
    mockSend.mockResolvedValue({});

    await registerCognitoUser("jane@example.com", "Secure@123", {
      gender: "female",
      formattedName: "Jane Doe",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].input).toEqual({
      ClientId: "client-123",
      Username: "jane@example.com",
      Password: "Secure@123",
      UserAttributes: [
        { Name: "email", Value: "jane@example.com" },
        { Name: "gender", Value: "female" },
        { Name: "name", Value: "Jane Doe" },
      ],
    });
  });

  it("confirms a Cognito user signup with a verification code", async () => {
    mockSend.mockResolvedValue({});

    await confirmCognitoUserSignUp("jane@example.com", "123456");

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].input).toEqual({
      ClientId: "client-123",
      Username: "jane@example.com",
      ConfirmationCode: "123456",
    });
  });

  it("sets a Cognito user password as permanent", async () => {
    mockSend.mockResolvedValue({});

    await setCognitoUserPassword("jane@example.com", "Secure@123");

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].input).toEqual({
      UserPoolId: "pool-123",
      Username: "jane@example.com",
      Password: "Secure@123",
      Permanent: true,
    });
  });

  it("syncs Cognito groups so only the target role remains", async () => {
    mockSend
      .mockResolvedValueOnce({
        Groups: [{ GroupName: "Admin" }, { GroupName: "Employee" }],
      })
      .mockResolvedValue({});

    await setCognitoUserRole("jane@example.com", "Manager");

    expect(mockSend).toHaveBeenCalledTimes(4);
    expect(mockSend.mock.calls[0][0].input).toEqual({
      UserPoolId: "pool-123",
      Username: "jane@example.com",
    });
    expect(mockSend.mock.calls[1][0].input).toEqual({
      UserPoolId: "pool-123",
      Username: "jane@example.com",
      GroupName: "Admin",
    });
    expect(mockSend.mock.calls[2][0].input).toEqual({
      UserPoolId: "pool-123",
      Username: "jane@example.com",
      GroupName: "Employee",
    });
    expect(mockSend.mock.calls[3][0].input).toEqual({
      UserPoolId: "pool-123",
      Username: "jane@example.com",
      GroupName: "Manager",
    });
  });

  it("does not re-add the role when the user already belongs to the target group", async () => {
    mockSend
      .mockResolvedValueOnce({
        Groups: [{ GroupName: "Manager" }, { GroupName: "Employee" }],
      })
      .mockResolvedValue({});

    await setCognitoUserRole("jane@example.com", "Manager");

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend.mock.calls[1][0].input).toEqual({
      UserPoolId: "pool-123",
      Username: "jane@example.com",
      GroupName: "Employee",
    });
  });

  it("deletes a Cognito user by email/username", async () => {
    mockSend.mockResolvedValue({});

    await deleteCognitoUser("jane@example.com");

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].input).toEqual({
      UserPoolId: "pool-123",
      Username: "jane@example.com",
    });
  });

  it("throws when the Cognito user pool id is not configured", async () => {
    delete process.env.COGNITO_USER_POOL_ID;

    await expect(
      setCognitoUserPassword("jane@example.com", "Secure@123")
    ).rejects.toThrow("COGNITO_USER_POOL_ID is not configured");
  });
});
