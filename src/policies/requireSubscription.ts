import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { subscriptionDecision } from "@contabilidad/shared-rules";
import { buildAbilityContext } from "./buildAbilityContext";
import { sendApiError } from "./http-error";

export function requireSubscription(prisma: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
      }

      const ability = await buildAbilityContext(prisma, req.auth.empresaId, req.auth.userId);
      req.ability = ability;

      const decision = subscriptionDecision(ability.tenant);
      if (!decision.ok) {
        return sendApiError(res, 402, decision.code, decision.message);
      }

      next();
    } catch (error) {
      return sendApiError(res, 401, "UNAUTHORIZED", "No fue posible construir el contexto de acceso.", error);
    }
  };
}