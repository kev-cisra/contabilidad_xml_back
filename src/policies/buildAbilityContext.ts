import type { PrismaClient } from "@prisma/client";
import {
  ModuleCode,
  PermissionCatalog,
  SubscriptionStatus,
  type AbilityContext,
  type PermissionName,
  type Tenant,
  type TenantModule,
} from "@contabilidad/shared-rules";

export async function buildAbilityContext(
  prisma: PrismaClient,
  empresaId: bigint,
  userId: bigint
): Promise<AbilityContext> {
  const empresa = await prisma.empresas.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      userLimit: true,
      tenantModules: {
        where: { deletedAt: null },
        select: {
          isEnabled: true,
          expiresAt: true,
          module: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });

  if (!empresa) {
    throw new Error("TENANT_NOT_FOUND");
  }

  const user = await prisma.usuario.findFirst({
    where: {
      id: userId,
      empresaId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      empresaId: true,
      isOwner: true,
      isActive: true,
      usuarioModulos: {
        where: {
          deletedAt: null,
          revokedAt: null,
        },
        select: {
          module: {
            select: {
              code: true,
            },
          },
        },
      },
      usuarioRoles: {
        where: {
          deletedAt: null,
        },
        select: {
          role: {
            select: {
              id: true,
              name: true,
              rolePermissions: {
                where: {
                  deletedAt: null,
                },
                select: {
                  permission: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("USER_NOT_ACTIVE");
  }

  const tenant: Tenant = {
    id: empresa.id.toString(),
    subscriptionStatus: empresa.subscriptionStatus as unknown as SubscriptionStatus,
    subscriptionExpiresAt: empresa.subscriptionExpiresAt,
    userLimit: empresa.userLimit,
  };

  const tenantModules: TenantModule[] = empresa.tenantModules
    .map((tm) => ({
      code: tm.module.code as ModuleCode,
      isEnabled: tm.isEnabled,
      expiresAt: tm.expiresAt,
    }))
    .filter((tm) => Object.values(ModuleCode).includes(tm.code));

  return {
    tenant,
    tenantModules,
    user: {
      id: user.id.toString(),
      empresaId: user.empresaId.toString(),
      isOwner: user.isOwner,
      isActive: user.isActive,
    },
    roles: user.usuarioRoles.map((ur) => {
      const permissions = ur.role.rolePermissions
        .map((rp) => rp.permission.name)
        .filter((name): name is PermissionName => name in PermissionCatalog)
        .map((permission) => ({ permission }));

      return {
        role: {
          id: ur.role.id.toString(),
          name: ur.role.name,
        },
        permissions,
      };
    }),
    userModules: user.usuarioModulos
      .map((um) => um.module.code as ModuleCode)
      .filter((code) => Object.values(ModuleCode).includes(code)),
  };
}
