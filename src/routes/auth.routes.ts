import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { prisma } from "../config/prisma";
import { requireAuth } from "../policies/requireAuth";

export const routePolicies = [
  { method: "POST", path: "/login", public: true, policies: [] },
  { method: "GET", path: "/logout", public: false, policies: ["requireAuth"] },
  { method: "GET", path: "/check-session", public: false, policies: ["requireAuth"] },
  { method: "GET", path: "/me/ability", public: false, policies: ["requireAuth"] },
  { method: "GET", path: "/menus", public: false, policies: ["requireAuth"] },
] as const;

const authRouter = Router();
const authGuard = requireAuth(prisma);

authRouter.post("/login", AuthController.login);
authRouter.get("/logout", authGuard, AuthController.logout);
authRouter.get("/check-session", authGuard, AuthController.checkSession);
authRouter.get("/me/ability", authGuard, AuthController.getAbilityContext);
authRouter.get("/menus", authGuard, AuthController.getUserMenus);

export { authRouter };