import request from "supertest";
import app from "../app";

it("Should return users for valid admin token", async () => {
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({
      email: "admin@test.com",
      password: "1234"
    });

  const token = loginRes.body.token;

  const res = await request(app)
    .get("/api/users")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
});
