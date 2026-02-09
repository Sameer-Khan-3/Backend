import express from "express";
import cors from "cors";
import roleRoutes from "./routes/roleRoutes";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

let users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

// health check
app.get("/", (_req, res) => {
  res.send("TypeScript backend running 🚀");
});

app.use("/api/roles", roleRoutes);

app.get("/api/users", (_req, res) => {
  res.json(users);
});

app.post("/api/users", (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name) return res.status(400).json({ error: "name required" });
  const id = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
  const user = { id, name };
  users.push(user);
  res.status(201).json(user);
});

app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});

export default app;
