// src/routes/auth.routes.ts

import { Router } from "express";
import { signUp, signIn, resetPasswordDirect} from "../controllers/auth.controller";
import { forgetPassword } from "../controllers/passwordReset.controller";
const router = Router();

// Public Routes
router.post("/signup", signUp);
router.post("/login", signIn);
router.post("/reset-password-direct", resetPasswordDirect);

export default router;