import type { AbilityContext, FacturapiEnv } from "@contabilidad/shared-rules";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        tokenId: bigint;
        userId: bigint;
        empresaId: bigint;
        rawToken: string;
      };
      ability?: AbilityContext;
      emisor?: {
        id: bigint;
        uuid: string;
        empresaId: bigint;
        organizationStatus?: "pending" | "active" | "blocked" | "disabled" | null;
      };
      facturapi?: {
        env: FacturapiEnv;
      };
    }
  }
}

export {};