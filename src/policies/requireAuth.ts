import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { hashToken } from "../utils/token";
import { sendApiError } from "./http-error";

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function requireAuth(prisma: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        return sendApiError(res, 401, "UNAUTHORIZED", "Token requerido.");
      }

      const tokenRecord = await prisma.token.findFirst({
        where: {
          secretHash: hashToken(token),
          type: "session",
          revokedAt: null,
          deletedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          usuarioId: true,
          usuario: {
            select: {
              id: true,
              empresaId: true,
              isActive: true,
              deletedAt: true,
            },
          },
        },
      });

      if (!tokenRecord || !tokenRecord.usuario || !tokenRecord.usuario.isActive || tokenRecord.usuario.deletedAt) {
        return sendApiError(res, 401, "UNAUTHORIZED", "Sesion invalida o expirada.");
      }

      req.auth = {
        tokenId: tokenRecord.id,
        userId: tokenRecord.usuario.id,
        empresaId: tokenRecord.usuario.empresaId,
        rawToken: token,
      };

      next();
    } catch (error) {
      return sendApiError(res, 401, "UNAUTHORIZED", "No fue posible validar la sesion.", error);
    }
  };
}