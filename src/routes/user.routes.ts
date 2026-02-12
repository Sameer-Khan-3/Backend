import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
//router.use(authenticate);

router.get("/", UserController.getUsers);
router.get("/:id", UserController.getUser);
router.post("/", UserController.createUser);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

export default router;
