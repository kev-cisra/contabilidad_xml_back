import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { canIssueCfdi, type FacturapiEnv } from "@contabilidad/shared-rules";
import { sendApiError } from "./http-error";

type FacturapiReadinessOptions = {
  envSource?: "body" | "query";
  envField?: string;
};

function readRawEnv(req: Request, options: FacturapiReadinessOptions): unknown {
  const envSource = options.envSource ?? "body";
  const envField = options.envField ?? "env";

  if (envSource === "query") {
    return req.query?.[envField];
  }

  const body = req.body as Record<string, unknown> | undefined;
  return body?.[envField];
}

function normalizeEnv(rawEnv: unknown): FacturapiEnv | null {
  if (rawEnv === "test" || rawEnv === "live") {
    return rawEnv;
  }
  return null;
}

export function requireFacturapiReadiness(prisma: PrismaClient, options: FacturapiReadinessOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.emisor) {
        return sendApiError(res, 500, "EMISOR_CONTEXT_MISSING", "El contexto de emisor no esta disponible.");
      }

      const env = normalizeEnv(readRawEnv(req, options));
      if (!env) {
        return sendApiError(res, 422, "INVALID_FACTURAPI_ENV", "Debes enviar env=test o env=live.");
      }

      const [organization, apiKey, certificate, emisorFacturapi] = await Promise.all([
        prisma.facturapiOrganization.findUnique({
          where: { emisorId: req.emisor.id },
          select: { status: true },
        }),
        prisma.facturapiApiKey.findFirst({
          where: {
            emisorId: req.emisor.id,
            env,
            revokedAt: null,
          },
          select: { id: true },
        }),
        prisma.facturapiCertificate.findFirst({
          where: {
            emisorId: req.emisor.id,
            env,
            isActive: true,
            deletedAt: null,
          },
          select: { id: true },
        }),
        prisma.emisor.findUnique({
          where: { id: req.emisor.id },
          select: { facturapiCustomerId: true },
        }),
      ]);

      const decision = canIssueCfdi({
        env,
        hasOrganization: Boolean(organization),
        hasCustomer: Boolean(emisorFacturapi?.facturapiCustomerId),
        organizationStatus: organization?.status ?? null,
        hasApiKey: Boolean(apiKey),
        hasCertificate: Boolean(certificate),
      });

      if (!decision.ok) {
        return sendApiError(res, 403, decision.code, decision.message);
      }

      req.facturapi = { env };
      next();
    } catch (error) {
      return sendApiError(res, 500, "FACTURAPI_READINESS_ERROR", "No fue posible validar Facturapi.", error);
    }
  };
}
