import { Router } from "express";
import { getUsers } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getUsers);

export default router;
