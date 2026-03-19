export {};

const mockVerify = jest.fn();
const mockGetSigningKey = jest.fn();

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    verify: mockVerify,
  },
}));

jest.mock("jwks-rsa", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getSigningKey: mockGetSigningKey,
  })),
}));

import { authenticate } from "../middleware/auth.middleware";
import { errorHandler } from "../middleware/error.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

describe("authenticate middleware", () => {
  let consoleLogSpy: jest.SpyInstance;

  const createResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("returns 401 when the authorization header is missing", () => {
    const req: any = { headers: {} };
    const res = createResponse();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 401 when the authorization header does not start with Bearer", () => {
    const req: any = { headers: { authorization: "Token abc123" } };
    const res = createResponse();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 401 when jwt verification fails", () => {
    const req: any = { headers: { authorization: "Bearer abc123" } };
    const res = createResponse();
    const next = jest.fn();

    mockVerify.mockImplementation(
      (
        _token: string,
        _getKey: unknown,
        _options: unknown,
        callback: (err: Error | null, decoded?: unknown) => void
      ) => {
        callback(new Error("invalid token"));
      }
    );

    authenticate(req, res, next);

    expect(mockVerify).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the token email is not verified", () => {
    const req: any = { headers: { authorization: "Bearer abc123" } };
    const res = createResponse();
    const next = jest.fn();
    const signingKey = { getPublicKey: jest.fn(() => "public-key") };

    mockGetSigningKey.mockImplementation(
      (
        _kid: string,
        callback: (err: Error | null, key?: typeof signingKey) => void
      ) => {
        callback(null, signingKey);
      }
    );

    mockVerify.mockImplementation(
      (
        _token: string,
        getKey: (
          header: { kid: string },
          callback: (err: Error | null, key?: string) => void
        ) => void,
        _options: unknown,
        callback: (err: Error | null, decoded?: any) => void
      ) => {
        getKey({ kid: "kid-123" }, () => {
          callback(null, { email: "jane@example.com", email_verified: false });
        });
      }
    );

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email verification required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("verifies the token via jwks and attaches the decoded user", () => {
    const req: any = { headers: { authorization: "Bearer abc123" } };
    const res = createResponse();
    const next = jest.fn();
    const signingKey = { getPublicKey: jest.fn(() => "public-key") };
    const decodedUser = {
      sub: "user-1",
      email: "jane@example.com",
      email_verified: true,
    };

    mockGetSigningKey.mockImplementation(
      (
        kid: string,
        callback: (err: Error | null, key?: typeof signingKey) => void
      ) => {
        expect(kid).toBe("kid-123");
        callback(null, signingKey);
      }
    );

    mockVerify.mockImplementation(
      (
        token: string,
        getKey: (
          header: { kid: string },
          callback: (err: Error | null, key?: string) => void
        ) => void,
        _options: unknown,
        callback: (err: Error | null, decoded?: unknown) => void
      ) => {
        expect(token).toBe("abc123");
        getKey({ kid: "kid-123" }, (_err, key) => {
          expect(key).toBe("public-key");
          callback(null, decodedUser);
        });
      }
    );

    authenticate(req, res, next);

    expect(mockGetSigningKey).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(decodedUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("authorizeRoles", () => {
  let consoleLogSpy: jest.SpyInstance;

  const createResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("returns 403 when req.user is missing", () => {
    const middleware = authorizeRoles("Admin");
    const req: any = {};
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when none of the Cognito groups match", () => {
    const middleware = authorizeRoles("Admin");
    const req: any = {
      user: {
        "cognito:groups": ["Employee"],
      },
    };
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when one of the Cognito groups matches", () => {
    const middleware = authorizeRoles("Admin", "Manager");
    const req: any = {
      user: {
        "cognito:groups": ["manager"],
      },
    };
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("errorHandler", () => {
  it("returns the provided status and message", () => {
    const req: any = {};
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorHandler(
      { status: 418, message: "teapot" },
      req,
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({ message: "teapot" });
  });
});
