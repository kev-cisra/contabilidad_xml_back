import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { sendApiError } from "./http-error";

export function resolveEmisorContext(prisma: PrismaClient, paramName = "emisorUuid") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
      }

      const rawUuid = req.params[paramName];
      const emisorUuid = Array.isArray(rawUuid) ? rawUuid[0] : rawUuid;
      if (!emisorUuid) {
        return sendApiError(res, 422, "VALIDATION_ERROR", "El parametro emisorUuid es obligatorio.");
      }

      const emisor = await prisma.emisor.findFirst({
        where: {
          uuid: emisorUuid,
          empresaId: req.auth.empresaId,
          deletedAt: null,
        },
        select: {
          id: true,
          uuid: true,
          empresaId: true,
          facturapiOrg: {
            select: {
              status: true,
            },
          },
        },
      });

      if (!emisor) {
        return sendApiError(res, 404, "EMISOR_NOT_FOUND", "No se encontro el emisor para tu empresa.");
      }

      req.emisor = {
        id: emisor.id,
        uuid: emisor.uuid,
        empresaId: emisor.empresaId,
        organizationStatus: emisor.facturapiOrg?.status ?? null,
      };

      next();
    } catch (error) {
      return sendApiError(res, 500, "EMISOR_RESOLVE_ERROR", "No fue posible resolver el emisor activo.", error);
    }
  };
}