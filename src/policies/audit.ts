import type { PrismaClient } from "@prisma/client";
import { type AuditAction, type ModuleCode } from "@contabilidad/shared-rules";

type AuditArgs = {
  empresaId: bigint;
  usuarioId?: bigint | null;
  module?: ModuleCode | null;
  action: AuditAction | string;
  entity?: string | null;
  entityId?: string | null;
  message?: string | null;
  meta?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

export async function audit(prisma: PrismaClient, args: AuditArgs) {
  await prisma.auditLog.create({
    data: {
      empresaId: args.empresaId,
      usuarioId: args.usuarioId ?? null,
      module: args.module ?? null,
      action: args.action,
      entity: args.entity ?? null,
      entityId: args.entityId ?? null,
      message: args.message ?? null,
      meta: args.meta as object | undefined,
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
    },
  });
}