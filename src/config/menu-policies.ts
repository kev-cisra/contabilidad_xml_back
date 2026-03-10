import { ModuleCode, type PermissionName } from "@contabilidad/shared-rules";

export type MenuPolicy = {
  module?: ModuleCode;
  permission?: PermissionName;
};

export const MENU_ACCESS_RULES: Record<string, MenuPolicy> = {
  "/dashboard": { permission: "facturacion.read" },
  "/emisores": { permission: "facturacion.read" },
  "/admin": { permission: "administracion.manage_users" },
};
