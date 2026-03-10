import type { NextFunction, Request, Response } from "express";
import { sendApiError } from "./http-error";

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.ability) {
    return sendApiError(res, 500, "ABILITY_NOT_BUILT", "El contexto de acceso no esta disponible.");
  }

  if (!req.ability.user.isOwner) {
    return sendApiError(res, 403, "OWNER_ONLY", "Esta accion solo esta permitida para el owner.");
  }

  next();
}