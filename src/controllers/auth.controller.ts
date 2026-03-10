import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { verifyPassword } from "../utils/password";
import type { LoginRequestBody } from "../interfaces/login.interface";
import { generateSessionToken } from "../utils/token";
import {
  moduleDecision,
  permissionDecision,
  subscriptionDecision,
} from "@contabilidad/shared-rules";
import { buildAbilityContext } from "../policies/buildAbilityContext";
import { MENU_ACCESS_RULES } from "../config/menu-policies";
import { sendApiError } from "../policies/http-error";

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = (req.body ?? {}) as LoginRequestBody;

    if (!email || !password) {
      return sendApiError(res, 422, "VALIDATION_ERROR", "El email y la contrasena son obligatorios.");
    }

    try {
      const user = await prisma.usuario.findUnique({
        where: { email },
        select: {
          id: true,
          password: true,
          isActive: true,
          deletedAt: true,
          uuid: true,
          nombre: true,
          email: true,
        },
      });

      if (!user || user.deletedAt) {
        return sendApiError(res, 401, "UNAUTHORIZED", "Credenciales invalidas.");
      }

      if (!user.isActive) {
        return sendApiError(res, 403, "USER_NOT_ACTIVE", "El usuario esta inactivo.");
      }

      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return sendApiError(res, 401, "UNAUTHORIZED", "Credenciales invalidas.");
      }

      await prisma.token.updateMany({
        where: {
          usuarioId: user.id,
          type: "session",
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      const { token, secretHash, expiresAt } = generateSessionToken();
      await prisma.token.create({
        data: {
          secretHash,
          type: "session",
          usuarioId: user.id,
          expiresAt,
        },
      });

      return res.status(200).json({
        message: "Login exitoso",
        user: {
          uuid: user.uuid,
          email: user.email,
          nombre: user.nombre,
        },
        token: {
          value: token,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (error) {
      return sendApiError(res, 500, "INTERNAL_SERVER_ERROR", "Error interno del servidor.", error);
    }
  }

  static async logout(req: Request, res: Response) {
    if (!req.auth) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    try {
      await prisma.token.updateMany({
        where: {
          id: req.auth.tokenId,
          usuarioId: req.auth.userId,
          type: "session",
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return res.status(200).json({ message: "ok" });
    } catch (error) {
      return sendApiError(res, 500, "INTERNAL_SERVER_ERROR", "No se pudo cerrar la sesion.", error);
    }
  }

  static async checkSession(req: Request, res: Response) {
    if (!req.auth) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    return res.status(200).json({ message: "ok" });
  }

  static async getAbilityContext(req: Request, res: Response) {
    if (!req.auth) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    try {
      const ability = await buildAbilityContext(prisma, req.auth.empresaId, req.auth.userId);
      return res.status(200).json({ message: "ok", datos: ability });
    } catch (error) {
      return sendApiError(
        res,
        500,
        "ABILITY_CONTEXT_ERROR",
        "No fue posible obtener el contexto de acceso.",
        error
      );
    }
  }

  static async getUserMenus(req: Request, res: Response) {
    if (!req.auth) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    try {
      const ability = await buildAbilityContext(prisma, req.auth.empresaId, req.auth.userId);
      const subDecision = subscriptionDecision(ability.tenant);

      const menus = await prisma.menus.findMany({
        where: {
          deletedAt: null,
          empresaId: req.auth.empresaId,
        },
        orderBy: {
          orden: "asc",
        },
        select: {
          uuid: true,
          nombre: true,
          ruta: true,
          icono: true,
          orden: true,
        },
      });

      const filteredMenus = menus.filter((menu) => {
        if (!menu.ruta) return false;
        if (!subDecision.ok) return false;

        const normalizedPath = normalizePath(menu.ruta);
        const routePolicy = MENU_ACCESS_RULES[normalizedPath];

        if (!routePolicy) return false;
        if (routePolicy.permission) {
          return permissionDecision(ability, routePolicy.permission).ok;
        }
        if (routePolicy.module) {
          return moduleDecision(ability, routePolicy.module).ok;
        }

        return true;
      });

      return res.status(200).json({ message: "ok", datos: filteredMenus });
    } catch (error) {
      return sendApiError(res, 500, "INTERNAL_SERVER_ERROR", "No se pudieron obtener los menus.", error);
    }
  }
}