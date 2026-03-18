import request from "supertest";

jest.mock("jwks-rsa", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getSigningKey: jest.fn(),
  })),
}));

import app from "../app";

describe("Protected Routes", () => {
  it("Should return 401 if no token", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });
});
