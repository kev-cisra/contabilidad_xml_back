import type { NextFunction, Request, Response } from "express";
import { type PermissionName, permissionDecision } from "@contabilidad/shared-rules";
import { sendApiError } from "./http-error";

export function requirePermission(permission: PermissionName) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.ability) {
      return sendApiError(res, 500, "ABILITY_NOT_BUILT", "El contexto de acceso no esta disponible.");
    }

    const decision = permissionDecision(req.ability, permission);
    if (!decision.ok) {
      return sendApiError(res, 403, decision.code, decision.message);
    }

    next();
  };
}