import request from "supertest";
import app from "../app";

describe("Protected Routes", () => {
  it("Should return 401 if no token", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });
});