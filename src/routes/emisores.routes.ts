import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { EmisoresController } from "../controllers/emisores.controller";
import { prisma } from "../config/prisma";
import { requireAuth } from "../policies/requireAuth";
import { requireSubscription } from "../policies/requireSubscription";
import { requirePermission } from "../policies/requirePermission";
import { resolveEmisorContext } from "../policies/resolveEmisorContext";

export const routePolicies = [
  {
    method: "GET",
    path: "/",
    public: false,
    policies: ["requireAuth", "requireSubscription", "requirePermission(facturacion.read)"],
  },
  {
    method: "GET",
    path: "/regimenes-fiscales",
    public: false,
    policies: ["requireAuth", "requireSubscription", "requirePermission(facturacion.read)"],
  },
  {
    method: "POST",
    path: "/",
    public: false,
    policies: [
      "requireAuth",
      "requireSubscription",
      "requirePermission(administracion.manage_modules)",
    ],
  },
  {
    method: "PUT",
    path: "/:emisorUuid",
    public: false,
    policies: [
      "requireAuth",
      "requireSubscription",
      "requirePermission(administracion.manage_modules)",
      "resolveEmisorContext",
    ],
  },
  {
    method: "DELETE",
    path: "/:emisorUuid",
    public: false,
    policies: [
      "requireAuth",
      "requireSubscription",
      "requirePermission(administracion.manage_modules)",
      "resolveEmisorContext",
    ],
  },
  {
    method: "GET",
    path: "/direccion/:cp",
    public: false,
    policies: [
      "requireAuth",
      "requireSubscription",
      "requirePermission(administracion.manage_modules)",
    ],
  },
  {
    method: "POST",
    path: "/:emisorUuid/csd",
    public: false,
    policies: [
      "requireAuth",
      "requireSubscription",
      "requirePermission(administracion.manage_modules)",
      "resolveEmisorContext",
    ],
  },
  {
    method: "DELETE",
    path: "/:emisorUuid/csd",
    public: false,
    policies: [
      "requireAuth",
      "requireSubscription",
      "requirePermission(administracion.manage_modules)",
      "resolveEmisorContext",
    ],
  },
] as const;

const emisoresRouter = Router();
const authGuard = requireAuth(prisma);
const subscriptionGuard = requireSubscription(prisma);
const emisorGuard = resolveEmisorContext(prisma);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 2,
    fileSize: 8 * 1024 * 1024,
  },
});
const csdUpload = upload.fields([
  { name: "cer", maxCount: 1 },
  { name: "key", maxCount: 1 },
]);

function parseMultipartCsdIfNeeded(req: Request, res: Response, next: NextFunction) {
  if (!req.is("multipart/form-data")) {
    return next();
  }

  return csdUpload(req, res, next);
}

emisoresRouter.get(
  "/",
  authGuard,
  subscriptionGuard,
  requirePermission("facturacion.read"),
  EmisoresController.listEmisores
);

emisoresRouter.get(
  "/regimenes-fiscales",
  authGuard,
  subscriptionGuard,
  requirePermission("facturacion.read"),
  EmisoresController.getRegimenesFiscales
);

emisoresRouter.post(
  "/",
  authGuard,
  subscriptionGuard,
  requirePermission("administracion.manage_modules"),
  parseMultipartCsdIfNeeded,
  EmisoresController.createEmisor
);

emisoresRouter.put(
  "/:emisorUuid",
  authGuard,
  subscriptionGuard,
  requirePermission("administracion.manage_modules"),
  emisorGuard,
  EmisoresController.updateEmisor
);

emisoresRouter.delete(
  "/:emisorUuid",
  authGuard,
  subscriptionGuard,
  requirePermission("administracion.manage_modules"),
  emisorGuard,
  EmisoresController.deleteEmisor
);

emisoresRouter.get(
  "/direccion/:cp",
  authGuard,
  subscriptionGuard,
  requirePermission("administracion.manage_modules"),
  EmisoresController.obtenerDireccion
);

emisoresRouter.post(
  "/:emisorUuid/csd",
  authGuard,
  subscriptionGuard,
  requirePermission("administracion.manage_modules"),
  emisorGuard,
  csdUpload,
  EmisoresController.upsertEmisorCsd
);

emisoresRouter.delete(
  "/:emisorUuid/csd",
  authGuard,
  subscriptionGuard,
  requirePermission("administracion.manage_modules"),
  emisorGuard,
  EmisoresController.deleteEmisorCsd
);

export { emisoresRouter };