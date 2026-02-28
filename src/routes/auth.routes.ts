// src/routes/auth.routes.ts

import { Router } from "express";
import { signUp, signIn, resetPassword} from "../controllers/auth.controller";
import { forgetPassword } from "../controllers/passwordReset.controller";
const router = Router();

// Public Routes
router.post("/signup", signUp);
router.post("/login", signIn);
router.post("/forgot-password", forgetPassword);
router.post("/reset-password", resetPassword);

export default router;