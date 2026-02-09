import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const authRouter = Router();

authRouter.post('/login', AuthController.login);

authRouter.get('/logout', authMiddleware, AuthController.logout);

authRouter.get('/check-session', authMiddleware, AuthController.checkSession);

authRouter.get('/menus', authMiddleware, AuthController.getUserMenus);

export { authRouter };