import { Router } from "express";
import { signUp, syncProfile } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", signUp);
router.post("/sync", authenticate, syncProfile);

export default router;
