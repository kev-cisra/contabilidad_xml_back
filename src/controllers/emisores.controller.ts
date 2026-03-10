
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import Facturapi, { type Customer, type Organization } from "facturapi";
import path from "node:path";
import { AuditActions, ModuleCode } from "@contabilidad/shared-rules";
import { prisma } from "../config/prisma";
import { sendApiError } from "../policies/http-error";
import { audit } from "../policies/audit";
import { saveAppFile } from "../utils/file-storage";
import {
  decryptFacturapiSecret,
  encryptFacturapiSecret,
  FacturapiSecretError,
} from "../utils/facturapi-secret";

type OrganizationAddressBody = {
  zip?: unknown;
  street?: unknown;
  exterior?: unknown;
  interior?: unknown;
  neighborhood?: unknown;
  municipality?: unknown;
  city?: unknown;
  state?: unknown;
  country?: unknown;
};

type OrganizationBody = {
  enabled?: unknown;
  name?: unknown;
  legalName?: unknown;
  legal_name?: unknown;
  taxId?: unknown;
  tax_id?: unknown;
  taxSystem?: unknown;
  tax_system?: unknown;
  curp?: unknown;
  supportEmail?: unknown;
  support_email?: unknown;
  email?: unknown;
  phone?: unknown;
  website?: unknown;
  address?: unknown;
};

type EmisorMutationBody = {
  nombre?: unknown;
  razonSocial?: unknown;
  rfc?: unknown;
  curp?: unknown;
  regimenFiscalUuid?: unknown;
  codigoPostal?: unknown;
  calle?: unknown;
  numeroExterior?: unknown;
  numeroInterior?: unknown;
  colonia?: unknown;
  municipio?: unknown;
  estado?: unknown;
  pais?: unknown;
  email?: unknown;
  telefono?: unknown;
  website?: unknown;
  csdPassword?: unknown;
  replaceCsd?: unknown;
  organization?: unknown;
};

type UploadedCsdFiles = {
  cer: Express.Multer.File | null;
  key: Express.Multer.File | null;
};

type NormalizedOrganizationInput = {
  enabled: boolean;
  name: string | null;
  legalName: string | null;
  taxId: string | null;
  taxSystem: string | null;
  curp: string | null;
  supportEmail: string | null;
  phone: string | null;
  website: string | null;
  address: {
    zip: string | null;
    street: string | null;
    exterior: string | null;
    interior: string | null;
    neighborhood: string | null;
    municipality: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
};

type SyncReadyEmisor = {
  id: bigint;
  uuid: string;
  nombre: string;
  razonSocial: string | null;
  rfc: string;
  curp: string | null;
  codigoPostal: string | null;
  calle: string | null;
  numeroExterior: string | null;
  numeroInterior: string | null;
  colonia: string | null;
  municipio: string | null;
  estado: string | null;
  pais: string | null;
  email: string | null;
  telefono: string | null;
  facturapiCustomerId: string | null;
  regimen: {
    clave: string;
  };
  facturapiOrg: {
    facturapiId: string;
  } | null;
  apiKeys: Array<{
    secretRef: string;
  }>;
};

type SyncResult = {
  customer: Customer;
  organization: Organization;
  liveApiKeys: unknown;
  organizationStatus: "pending" | "active";
  canInvoice: boolean;
  expiresAt: Date | null;
  testApiKey: string;
  liveApiKey: string | null;
};

class ManagedError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status = 422, details?: unknown) {
    super(message);
    this.name = "ManagedError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const FACTURAPI_API_VERSION = "v2";
const emisorMutationKeys: Array<keyof EmisorMutationBody> = [
  "nombre",
  "razonSocial",
  "rfc",
  "curp",
  "regimenFiscalUuid",
  "codigoPostal",
  "calle",
  "numeroExterior",
  "numeroInterior",
  "colonia",
  "municipio",
  "estado",
  "pais",
  "email",
  "telefono",
  "website",
  "organization",
];

const emisorListSelect = {
  uuid: true,
  nombre: true,
  razonSocial: true,
  rfc: true,
  regimen: {
    select: {
      uuid: true,
      clave: true,
      descripcion: true,
    },
  },
  curp: true,
  codigoPostal: true,
  calle: true,
  numeroExterior: true,
  numeroInterior: true,
  colonia: true,
  municipio: true,
  estado: true,
  pais: true,
  email: true,
  telefono: true,
  facturapiCustomerId: true,
  facturapiCanInvoice: true,
  facturapiExpiresAt: true,
  facturapiLastSyncAt: true,
  facturapiLastError: true,
  facturapiLastErrorAt: true,
  createdAt: true,
  updatedAt: true,
  facturapiOrg: {
    select: {
      facturapiId: true,
      status: true,
    },
  },
  certificates: {
    where: {
      isActive: true,
      deletedAt: null,
      env: "test",
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 1,
    select: {
      uuid: true,
      serialNumber: true,
      validTo: true,
    },
  },
} as const;

type EmisorListItem = Prisma.emisorGetPayload<{
  select: typeof emisorListSelect;
}>;

function normalizeString(
  value: unknown,
  options: { upper?: boolean; lower?: boolean; nullable?: boolean } = {}
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return options.nullable ? null : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return options.nullable ? null : undefined;
  }

  if (options.upper) {
    return trimmed.toUpperCase();
  }

  if (options.lower) {
    return trimmed.toLowerCase();
  }

  return trimmed;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

function firstDefined(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key];
    }
  }
  return undefined;
}

function parseMutationBody(req: Request): EmisorMutationBody {
  const rawBody = { ...((req.body ?? {}) as Record<string, unknown>) };

  if (typeof rawBody.organization === "string") {
    try {
      rawBody.organization = JSON.parse(rawBody.organization);
    } catch {
      // si no es JSON valido, se deja tal cual y lo validara normalizeOrganizationInput
    }
  }

  return rawBody as EmisorMutationBody;
}

function getUploadedCsdFiles(req: Request): UploadedCsdFiles {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return {
    cer: files?.cer?.[0] ?? null,
    key: files?.key?.[0] ?? null,
  };
}

function requireCsdExtension(file: Express.Multer.File, extension: ".cer" | ".key", field: "cer" | "key") {
  const receivedExtension = path.extname(file.originalname ?? "").toLowerCase();
  if (receivedExtension !== extension) {
    throw new ManagedError(
      "VALIDATION_ERROR",
      `El archivo ${field} debe tener extension ${extension}.`,
      422,
      { field, expectedExtension: extension, receivedExtension }
    );
  }
}

async function saveCsdLocalFiles(userId: bigint, cerFile: Express.Multer.File, keyFile: Express.Multer.File) {
  const userSegment = String(userId);

  const cerSaved = await saveAppFile({
    file: {
      buffer: cerFile.buffer,
      originalname: cerFile.originalname,
      filename: cerFile.originalname,
    },
    baseDir: "uploads",
    subDir: `${userSegment}/Cer`,
    fileName: "CSD.cer",
  });

  const keySaved = await saveAppFile({
    file: {
      buffer: keyFile.buffer,
      originalname: keyFile.originalname,
      filename: keyFile.originalname,
    },
    baseDir: "uploads",
    subDir: `${userSegment}/Key`,
    fileName: "CSD.key",
  });

  return {
    cerPath: `./${userSegment}/Cer/CSD.cer`,
    keyPath: `./${userSegment}/Key/CSD.key`,
    localCerPath: cerSaved.filePath,
    localKeyPath: keySaved.filePath,
  };
}

function hasAtLeastOneField(body: EmisorMutationBody): boolean {
  return emisorMutationKeys.some((key) => body[key] !== undefined);
}

function compactObject(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter((entry) => entry[1] !== undefined && entry[1] !== null)
  );
}

function normalizeCustomerCountry(country: string | null): string | undefined {
  if (!country) {
    return undefined;
  }

  const normalized = country
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (normalized === "MEXICO" || normalized === "MEX" || normalized === "MX") {
    return "MEX";
  }

  return normalized;
}

function normalizePhoneForCustomer(phone: string | null): number | undefined {
  if (!phone) {
    return undefined;
  }

  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return undefined;
  }

  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  return numeric;
}

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  const seen = new WeakSet<object>();
  const serialized = JSON.stringify(value, (_key, currentValue: unknown) => {
    if (currentValue instanceof Error) {
      return {
        name: currentValue.name,
        message: currentValue.message,
        stack: currentValue.stack,
      };
    }

    if (currentValue instanceof Date) {
      return currentValue.toISOString();
    }

    if (typeof currentValue === "bigint") {
      return currentValue.toString();
    }

    if (typeof currentValue === "object" && currentValue !== null) {
      if (seen.has(currentValue)) {
        return "[Circular]";
      }
      seen.add(currentValue);
    }

    return currentValue;
  });

  if (serialized === undefined) {
    return {};
  }

  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

function toFacturapiErrorDetails(error: unknown): Prisma.InputJsonValue {
  if (error instanceof ManagedError) {
    return toPrismaJson({
      code: error.code,
      message: error.message,
      details: error.details ?? null,
    });
  }

  if (error instanceof Error) {
    const maybeError = error as Error & {
      status?: number;
      response?: unknown;
      code?: string;
    };

    return toPrismaJson({
      code: maybeError.code ?? null,
      status: maybeError.status ?? null,
      message: error.message,
      response: maybeError.response ?? null,
    });
  }

  return toPrismaJson({ message: "Unexpected Facturapi error", error });
}

function mapCryptoError(error: unknown, action: "encrypt" | "decrypt"): ManagedError {
  if (error instanceof FacturapiSecretError) {
    if (error.code === "MISSING_CIPHER_KEY") {
      return new ManagedError(
        "FACTURAPI_ENCRYPTION_KEY_MISSING",
        "Falta FACTURAPI_KEYS_ENCRYPTION_KEY para manejar llaves de Facturapi cifradas.",
        422
      );
    }

    if (action === "decrypt") {
      return new ManagedError(
        "FACTURAPI_KEY_DECRYPT_ERROR",
        "No se pudo descifrar la llave de Facturapi almacenada localmente.",
        422
      );
    }

    return new ManagedError(
      "FACTURAPI_KEY_ENCRYPT_ERROR",
      "No se pudo cifrar la llave de Facturapi para almacenamiento local.",
      422
    );
  }

  return new ManagedError(
    action === "decrypt" ? "FACTURAPI_KEY_DECRYPT_ERROR" : "FACTURAPI_KEY_ENCRYPT_ERROR",
    action === "decrypt"
      ? "No se pudo descifrar la llave de Facturapi almacenada localmente."
      : "No se pudo cifrar la llave de Facturapi para almacenamiento local.",
    422,
    error
  );
}

function encryptApiKey(rawSecret: string): string {
  try {
    return encryptFacturapiSecret(rawSecret);
  } catch (error) {
    throw mapCryptoError(error, "encrypt");
  }
}

function decryptApiKey(encryptedSecret: string): string {
  try {
    return decryptFacturapiSecret(encryptedSecret);
  } catch (error) {
    throw mapCryptoError(error, "decrypt");
  }
}

function getFacturapiAdminClient() {
  const facturapiKey = process.env.FACTURAPI_KEY?.trim();
  if (!facturapiKey) {
    throw new ManagedError(
      "FACTURAPI_KEY_MISSING",
      "No se encontro la API key de Facturapi en variables de entorno.",
      422
    );
  }

  return new Facturapi(facturapiKey, { apiVersion: FACTURAPI_API_VERSION });
}

function normalizeOrganizationInput(rawOrganization: unknown): NormalizedOrganizationInput | null {
  if (rawOrganization === undefined) {
    return null;
  }

  if (rawOrganization === null) {
    return {
      enabled: false,
      name: null,
      legalName: null,
      taxId: null,
      taxSystem: null,
      curp: null,
      supportEmail: null,
      phone: null,
      website: null,
      address: null,
    };
  }

  if (typeof rawOrganization !== "object" || Array.isArray(rawOrganization)) {
    throw new ManagedError(
      "VALIDATION_ERROR",
      "El campo organization debe ser un objeto valido o null.",
      422
    );
  }

  const organization = rawOrganization as OrganizationBody & Record<string, unknown>;
  const enabled = normalizeBoolean(firstDefined(organization, ["enabled"])) ?? true;

  const rawAddress = organization.address;
  let address: NormalizedOrganizationInput["address"] = null;

  if (rawAddress !== undefined && rawAddress !== null) {
    if (typeof rawAddress !== "object" || Array.isArray(rawAddress)) {
      throw new ManagedError("VALIDATION_ERROR", "organization.address debe ser un objeto valido.", 422);
    }

    const organizationAddress = rawAddress as OrganizationAddressBody & Record<string, unknown>;
    address = {
      zip: normalizeString(firstDefined(organizationAddress, ["zip"]), { nullable: true }) ?? null,
      street: normalizeString(firstDefined(organizationAddress, ["street"]), { nullable: true }) ?? null,
      exterior: normalizeString(firstDefined(organizationAddress, ["exterior"]), { nullable: true }) ?? null,
      interior: normalizeString(firstDefined(organizationAddress, ["interior"]), { nullable: true }) ?? null,
      neighborhood:
        normalizeString(firstDefined(organizationAddress, ["neighborhood"]), { nullable: true }) ?? null,
      municipality:
        normalizeString(firstDefined(organizationAddress, ["municipality"]), { nullable: true }) ?? null,
      city: normalizeString(firstDefined(organizationAddress, ["city"]), { nullable: true }) ?? null,
      state: normalizeString(firstDefined(organizationAddress, ["state"]), { nullable: true }) ?? null,
      country:
        normalizeString(firstDefined(organizationAddress, ["country"]), {
          upper: true,
          nullable: true,
        }) ?? null,
    };
  }

  return {
    enabled,
    name: normalizeString(firstDefined(organization, ["name"]), { nullable: true }) ?? null,
    legalName:
      normalizeString(firstDefined(organization, ["legalName", "legal_name"]), { nullable: true }) ?? null,
    taxId: normalizeString(firstDefined(organization, ["taxId", "tax_id"]), {
      upper: true,
      nullable: true,
    }) ?? null,
    taxSystem:
      normalizeString(firstDefined(organization, ["taxSystem", "tax_system"]), {
        nullable: true,
      }) ?? null,
    curp: normalizeString(firstDefined(organization, ["curp"]), {
      upper: true,
      nullable: true,
    }) ?? null,
    supportEmail:
      normalizeString(firstDefined(organization, ["supportEmail", "support_email", "email"]), {
        lower: true,
        nullable: true,
      }) ?? null,
    phone: normalizeString(firstDefined(organization, ["phone"]), { nullable: true }) ?? null,
    website: normalizeString(firstDefined(organization, ["website"]), { nullable: true }) ?? null,
    address,
  };
}

function buildCustomerPayload(emisor: SyncReadyEmisor) {
  if (!emisor.codigoPostal) {
    throw new ManagedError(
      "FACTURAPI_ZIP_REQUIRED",
      "El codigo postal es obligatorio para sincronizar el cliente en Facturapi.",
      422
    );
  }

  const customerCountry = normalizeCustomerCountry(emisor.pais ?? null) ?? "MEX";
  const address = compactObject({
    zip: emisor.codigoPostal,
    street: emisor.calle,
    exterior: emisor.numeroExterior,
    interior: emisor.numeroInterior,
    neighborhood: emisor.colonia,
    city: emisor.municipio,
    municipality: emisor.municipio,
    state: emisor.estado,
    country: customerCountry,
  });

  return compactObject({
    legal_name: emisor.razonSocial ?? emisor.nombre,
    tax_id: emisor.rfc,
    tax_system: emisor.regimen.clave,
    email: emisor.email,
    phone: normalizePhoneForCustomer(emisor.telefono),
    default_invoice_use: "G01",
    address,
  });
}

function buildOrganizationLegalPayload(
  emisor: SyncReadyEmisor,
  organizationInput: NormalizedOrganizationInput | null
) {
  const zip = organizationInput?.address?.zip ?? emisor.codigoPostal;
  if (!zip) {
    throw new ManagedError(
      "FACTURAPI_ORG_ZIP_REQUIRED",
      "No se pudo preparar la direccion de la organizacion para Facturapi porque falta codigo postal.",
      422
    );
  }

  const address = compactObject({
    zip,
    street: organizationInput?.address?.street ?? emisor.calle,
    exterior: organizationInput?.address?.exterior ?? emisor.numeroExterior,
    interior: organizationInput?.address?.interior ?? emisor.numeroInterior,
    neighborhood: organizationInput?.address?.neighborhood ?? emisor.colonia,
    municipality: organizationInput?.address?.municipality ?? emisor.municipio,
    city: organizationInput?.address?.city ?? emisor.municipio,
    state: organizationInput?.address?.state ?? emisor.estado,
  });

  return compactObject({
    name: organizationInput?.name ?? emisor.nombre,
    legal_name: organizationInput?.legalName ?? emisor.razonSocial ?? emisor.nombre,
    tax_system: organizationInput?.taxSystem ?? emisor.regimen.clave,
    support_email: organizationInput?.supportEmail ?? emisor.email,
    phone: organizationInput?.phone ?? emisor.telefono,
    website: organizationInput?.website,
    address,
  });
}

function getInvoiceReadiness(organization: Organization) {
  const expiresAt = parseDate(organization.certificate?.expires_at ?? null);
  const canInvoice = Boolean(
    organization.is_production_ready && (!expiresAt || expiresAt.getTime() > Date.now())
  );

  return {
    organizationStatus: organization.is_production_ready ? "active" : "pending",
    canInvoice,
    expiresAt,
  } as const;
}

function resolveNoInvoiceReason(emisor: EmisorListItem): string | null {
  if (!emisor.facturapiOrg?.facturapiId) {
    return "No tiene organizacion de Facturapi configurada.";
  }

  if (!emisor.facturapiCustomerId) {
    return "No tiene cliente de Facturapi sincronizado.";
  }

  if (emisor.facturapiExpiresAt && emisor.facturapiExpiresAt.getTime() <= Date.now()) {
    return "La vigencia del certificado de Facturapi esta vencida.";
  }

  if (!emisor.facturapiCanInvoice) {
    return "La organizacion de Facturapi aun no esta lista para facturar.";
  }

  return null;
}

function mapEmisorForResponse(emisor: EmisorListItem) {
  const reason = resolveNoInvoiceReason(emisor);

  return {
    ...emisor,
    puedeFacturar: emisor.facturapiCanInvoice,
    fechaCaducidad: emisor.facturapiExpiresAt,
    motivoNoPuedeFacturar: reason,
    csdConfigured: emisor.certificates.length > 0,
    csd: emisor.certificates[0] ?? null,
    facturapiStatus: {
      organizationConfigured: Boolean(emisor.facturapiOrg?.facturapiId),
      customerConfigured: Boolean(emisor.facturapiCustomerId),
      canInvoice: emisor.facturapiCanInvoice,
      expiresAt: emisor.facturapiExpiresAt,
      reason,
    },
  };
}

async function loadEmisorForSync(emisorId: bigint): Promise<SyncReadyEmisor> {
  const emisor = await prisma.emisor.findUnique({
    where: { id: emisorId },
    select: {
      id: true,
      uuid: true,
      nombre: true,
      razonSocial: true,
      rfc: true,
      curp: true,
      codigoPostal: true,
      calle: true,
      numeroExterior: true,
      numeroInterior: true,
      colonia: true,
      municipio: true,
      estado: true,
      pais: true,
      email: true,
      telefono: true,
      facturapiCustomerId: true,
      regimen: {
        select: {
          clave: true,
        },
      },
      facturapiOrg: {
        select: {
          facturapiId: true,
        },
      },
      apiKeys: {
        where: {
          env: "test",
          revokedAt: null,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: {
          secretRef: true,
        },
      },
    },
  });

  if (!emisor) {
    throw new ManagedError("EMISOR_NOT_FOUND", "No se encontro el cliente/emisor para sincronizar.", 409);
  }

  return emisor;
}

async function syncEmisorWithFacturapi(
  emisor: SyncReadyEmisor,
  organizationInput: NormalizedOrganizationInput | null
): Promise<SyncResult> {
  const adminClient = getFacturapiAdminClient();

  let organizationId = emisor.facturapiOrg?.facturapiId ?? null;
  if (!organizationId) {
    if (!organizationInput?.enabled) {
      throw new ManagedError(
        "FACTURAPI_ORGANIZATION_REQUIRED",
        "Debes cargar la informacion de organizacion para habilitar facturacion en este cliente.",
        422
      );
    }

    const createdOrganization = await adminClient.organizations.create({
      name: organizationInput.name ?? emisor.nombre,
    });
    organizationId = createdOrganization.id;
  }

  const legalPayload = buildOrganizationLegalPayload(emisor, organizationInput);
  await adminClient.organizations.updateLegal(organizationId, legalPayload);

  let decryptedKey = emisor.apiKeys[0]?.secretRef ? decryptApiKey(emisor.apiKeys[0].secretRef) : null;
  if (!decryptedKey) {
    decryptedKey = await adminClient.organizations.getTestApiKey(organizationId);
  }

  const facturapiOrgClient = new Facturapi(decryptedKey, { apiVersion: FACTURAPI_API_VERSION });
  const customerPayload = buildCustomerPayload(emisor);

  const customer = emisor.facturapiCustomerId
    ? await facturapiOrgClient.customers.update(emisor.facturapiCustomerId, customerPayload)
    : await facturapiOrgClient.customers.create(customerPayload);

  const organization = await adminClient.organizations.retrieve(organizationId);

  let liveApiKeys: unknown = null;
  try {
    liveApiKeys = await adminClient.organizations.listLiveApiKeys(organizationId);
  } catch {
    liveApiKeys = null;
  }

  const readiness = getInvoiceReadiness(organization);

  let liveApiKey: string | null = null;
  if (process.env.NODE_ENV === "production" && readiness.organizationStatus === "active") {
    try {
      liveApiKey = await adminClient.organizations.renewLiveApiKey(organizationId);
    } catch {
      liveApiKey = null;
    }
  }

  return {
    customer,
    organization,
    liveApiKeys,
    organizationStatus: readiness.organizationStatus,
    canInvoice: readiness.canInvoice,
    expiresAt: readiness.expiresAt,
    testApiKey: decryptedKey,
    liveApiKey,
  };
}

async function persistSyncSuccess(emisorId: bigint, syncResult: SyncResult) {
  const now = new Date();
  const customerAddress = syncResult.customer.address;
  const encryptedApiKey = encryptApiKey(syncResult.testApiKey);
  const encryptedLiveApiKey = syncResult.liveApiKey ? encryptApiKey(syncResult.liveApiKey) : null;

  await prisma.$transaction(async (tx) => {
    await tx.emisor.update({
      where: { id: emisorId },
      data: {
        razonSocial: syncResult.customer.legal_name ?? undefined,
        rfc: syncResult.customer.tax_id?.toUpperCase() ?? undefined,
        curp: syncResult.customer.curp ?? undefined,
        codigoPostal: customerAddress?.zip ?? undefined,
        calle: customerAddress?.street ?? undefined,
        numeroExterior: customerAddress?.exterior ?? undefined,
        numeroInterior: customerAddress?.interior ?? undefined,
        colonia: customerAddress?.neighborhood ?? undefined,
        municipio: customerAddress?.municipality ?? customerAddress?.city ?? undefined,
        estado: customerAddress?.state ?? undefined,
        pais: customerAddress?.country ?? undefined,
        email: syncResult.customer.email ?? undefined,
        telefono: syncResult.customer.phone ? String(syncResult.customer.phone) : undefined,
        facturapiCustomerId: syncResult.customer.id,
        facturapiCanInvoice: syncResult.canInvoice,
        facturapiExpiresAt: syncResult.expiresAt,
        facturapiLastSyncAt: now,
        facturapiLastError: Prisma.DbNull,
        facturapiLastErrorAt: null,
        facturapiCustomerData: toPrismaJson(syncResult.customer),
        facturapiOrganizationData: toPrismaJson({
          organization: syncResult.organization,
          liveApiKeys: syncResult.liveApiKeys,
        }),
      },
    });

    await tx.facturapiOrganization.upsert({
      where: {
        emisorId,
      },
      update: {
        facturapiId: syncResult.organization.id,
        status: syncResult.organizationStatus,
      },
      create: {
        emisorId,
        facturapiId: syncResult.organization.id,
        status: syncResult.organizationStatus,
      },
    });

    await tx.facturapiApiKey.upsert({
      where: {
        emisorId_env: {
          emisorId,
          env: "test",
        },
      },
      update: {
        secretRef: encryptedApiKey,
        last4: syncResult.testApiKey.slice(-4),
        revokedAt: null,
      },
      create: {
        emisorId,
        env: "test",
        secretRef: encryptedApiKey,
        last4: syncResult.testApiKey.slice(-4),
      },
    });

    if (encryptedLiveApiKey && syncResult.liveApiKey) {
      await tx.facturapiApiKey.upsert({
        where: {
          emisorId_env: {
            emisorId,
            env: "live",
          },
        },
        update: {
          secretRef: encryptedLiveApiKey,
          last4: syncResult.liveApiKey.slice(-4),
          revokedAt: null,
        },
        create: {
          emisorId,
          env: "live",
          secretRef: encryptedLiveApiKey,
          last4: syncResult.liveApiKey.slice(-4),
        },
      });
    }
  });
}

async function persistSyncError(emisorId: bigint, error: unknown) {
  const now = new Date();

  await prisma.emisor.update({
    where: { id: emisorId },
    data: {
      facturapiCanInvoice: false,
      facturapiLastSyncAt: now,
      facturapiLastErrorAt: now,
      facturapiLastError: toFacturapiErrorDetails(error),
    },
  });
}

async function persistOrganizationNotConfigured(emisorId: bigint) {
  const now = new Date();

  await prisma.emisor.update({
    where: { id: emisorId },
    data: {
      facturapiCanInvoice: false,
      facturapiExpiresAt: null,
      facturapiLastSyncAt: now,
      facturapiLastErrorAt: now,
      facturapiLastError: toPrismaJson({
        code: "FACTURAPI_ORGANIZATION_MISSING",
        message:
          "No se ha configurado la organizacion de Facturapi. Este cliente no puede generar facturas hasta completarla.",
      }),
    },
  });
}

async function uploadAndPersistCsd(params: {
  emisorId: bigint;
  userId: bigint;
  organizationId: string;
  cerFile: Express.Multer.File;
  keyFile: Express.Multer.File;
  csdPassword: string;
  replaceExisting: boolean;
}) {
  requireCsdExtension(params.cerFile, ".cer", "cer");
  requireCsdExtension(params.keyFile, ".key", "key");

  const existingCsd = await prisma.facturapiCertificate.findFirst({
    where: {
      emisorId: params.emisorId,
      env: "test",
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  const adminClient = getFacturapiAdminClient();

  if (existingCsd) {
    if (!params.replaceExisting) {
      throw new ManagedError(
        "CSD_ALREADY_EXISTS",
        "Ya existe un CSD guardado. Debes confirmar reemplazo para continuar.",
        409,
        { confirmationRequired: true }
      );
    }

    await adminClient.organizations.deleteCertificate(params.organizationId);

    await prisma.facturapiCertificate.updateMany({
      where: {
        emisorId: params.emisorId,
        isActive: true,
        deletedAt: null,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  const localFiles = await saveCsdLocalFiles(params.userId, params.cerFile, params.keyFile);
  const uploadedOrganization = await adminClient.organizations.uploadCertificate(
    params.organizationId,
    params.cerFile.buffer,
    params.keyFile.buffer,
    params.csdPassword
  );

  const uploadedCertificate = uploadedOrganization.certificate;
  if (!uploadedCertificate?.has_certificate) {
    throw new ManagedError(
      "FACTURAPI_CSD_UPLOAD_ERROR",
      "No se pudo verificar la carga del CSD en Facturapi.",
      422
    );
  }

  const encryptedPassword = encryptApiKey(params.csdPassword);
  const now = new Date();
  const validFrom = parseDate(uploadedCertificate.updated_at ?? null);
  const validTo = parseDate(uploadedCertificate.expires_at ?? null);
  const serialNumber = uploadedCertificate.serial_number ?? null;
  const readiness = getInvoiceReadiness(uploadedOrganization);

  await prisma.$transaction(async (tx) => {
    await tx.emisor.update({
      where: { id: params.emisorId },
      data: {
        facturapiCanInvoice: readiness.canInvoice,
        facturapiExpiresAt: readiness.expiresAt,
        facturapiLastSyncAt: now,
        facturapiLastError: Prisma.DbNull,
        facturapiLastErrorAt: null,
        facturapiOrganizationData: toPrismaJson({
          organization: uploadedOrganization,
        }),
      },
    });

    await tx.facturapiOrganization.upsert({
      where: {
        emisorId: params.emisorId,
      },
      update: {
        facturapiId: params.organizationId,
        status: readiness.organizationStatus,
      },
      create: {
        emisorId: params.emisorId,
        facturapiId: params.organizationId,
        status: readiness.organizationStatus,
      },
    });

    for (const env of ["test", "live"] as const) {
      const existingByEnv = await tx.facturapiCertificate.findFirst({
        where: {
          emisorId: params.emisorId,
          env,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (existingByEnv) {
        await tx.facturapiCertificate.update({
          where: {
            id: existingByEnv.id,
          },
          data: {
            cerPath: localFiles.cerPath,
            keyPath: localFiles.keyPath,
            keyPassEnc: encryptedPassword,
            serialNumber,
            validFrom,
            validTo,
            isActive: true,
            deletedAt: null,
          },
        });
      } else {
        await tx.facturapiCertificate.create({
          data: {
            emisorId: params.emisorId,
            env,
            cerPath: localFiles.cerPath,
            keyPath: localFiles.keyPath,
            keyPassEnc: encryptedPassword,
            serialNumber,
            validFrom,
            validTo,
            isActive: true,
          },
        });
      }
    }
  });

  return {
    serialNumber,
    validTo,
    localCerPath: localFiles.localCerPath,
    localKeyPath: localFiles.localKeyPath,
  };
}

async function deleteAndDeactivateCsd(emisorId: bigint, organizationId: string) {
  const adminClient = getFacturapiAdminClient();
  await adminClient.organizations.deleteCertificate(organizationId);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.facturapiCertificate.updateMany({
      where: {
        emisorId,
        isActive: true,
        deletedAt: null,
      },
      data: {
        isActive: false,
        deletedAt: now,
      },
    });

    await tx.emisor.update({
      where: { id: emisorId },
      data: {
        facturapiCanInvoice: false,
        facturapiExpiresAt: null,
        facturapiLastSyncAt: now,
      },
    });
  });
}

function sendHandledError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof ManagedError) {
    return sendApiError(res, error.status, error.code, error.message, error.details);
  }

  return sendApiError(res, 500, "INTERNAL_SERVER_ERROR", fallbackMessage, error);
}

export class EmisoresController {
  static async getRegimenesFiscales(req: Request, res: Response) {
    if (!req.auth) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    try {
      const regimenes = await prisma.regimenFiscal.findMany({
        where: { deletedAt: null },
        orderBy: { clave: "asc" },
        select: {
          uuid: true,
          clave: true,
          descripcion: true,
          tipoPersona: true,
        },
      });

      return res.status(200).json({ message: "ok", datos: regimenes });
    } catch (error) {
      return sendApiError(res, 500, "INTERNAL_SERVER_ERROR", "No se pudo obtener el catalogo fiscal.", error);
    }
  }

  static async obtenerDireccion(req: Request, res: Response) {
    try {
        const { cp } = req.params
        const apiKey = process.env.DIRECCION_API // Tu API key del .env
        
        if (!apiKey) {
            return res.status(500).json({ message: 'API key no configurada' })
        }
        
        const response = await fetch(`https://api.tau.com.mx/dipomex/v1/codigo_postal?cp=${cp}`, {
            method: 'GET',
            headers: { 'APIKEY': apiKey }
        })
        
        console.log('Respuesta de la API de direcciones:', response)

        const data = await response.json()
        res.json({ message: 'ok', datos: data })
    } catch (error) {
        res.status(500).json({ message: 'Error al buscar dirección' })
    }
  }

  static async listEmisores(req: Request, res: Response) {
    if (!req.auth) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    try {
      const emisores = await prisma.emisor.findMany({
        where: {
          empresaId: req.auth.empresaId,
          deletedAt: null,
        },
        orderBy: {
          nombre: "asc",
        },
        select: emisorListSelect,
      });

      return res.status(200).json({
        message: "ok",
        datos: emisores.map((emisor) => mapEmisorForResponse(emisor)),
      });
    } catch (error) {
      return sendApiError(res, 500, "INTERNAL_SERVER_ERROR", "No se pudieron obtener los clientes.", error);
    }
  }

  static async createEmisor(req: Request, res: Response) {
    if (!req.auth) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    const body = parseMutationBody(req);

    const nombre = normalizeString(body.nombre);
    const razonSocial = normalizeString(body.razonSocial);
    const regimenFiscalUuid = normalizeString(body.regimenFiscalUuid);
    const rfc = normalizeString(body.rfc, { upper: true });
    const codigoPostal = normalizeString(body.codigoPostal);

    if (!nombre || !razonSocial || !regimenFiscalUuid || !rfc || !codigoPostal) {
      return sendApiError(
        res,
        422,
        "VALIDATION_ERROR",
        "Los campos nombre, razonSocial, regimenFiscalUuid, rfc y codigoPostal son obligatorios."
      );
    }

    const { cer: cerFile, key: keyFile } = getUploadedCsdFiles(req);
    const csdPassword = normalizeString(body.csdPassword);
    if (!cerFile || !keyFile || !csdPassword) {
      return sendApiError(
        res,
        422,
        "VALIDATION_ERROR",
        "Los campos cer, key y csdPassword son obligatorios para crear el cliente."
      );
    }

    const curp = normalizeString(body.curp, { upper: true, nullable: true });
    const calle = normalizeString(body.calle, { nullable: true });
    const numeroExterior = normalizeString(body.numeroExterior, { nullable: true });
    const numeroInterior = normalizeString(body.numeroInterior, { nullable: true });
    const colonia = normalizeString(body.colonia, { nullable: true });
    const municipio = normalizeString(body.municipio, { nullable: true });
    const estado = normalizeString(body.estado, { nullable: true });
    const pais = normalizeString(body.pais, { upper: true, nullable: true });
    const email = normalizeString(body.email, { lower: true, nullable: true });
    const telefono = normalizeString(body.telefono, { nullable: true });

    try {
      const organizationInput = normalizeOrganizationInput(body.organization);
      if (!organizationInput?.enabled) {
        return sendApiError(
          res,
          422,
          "FACTURAPI_ORGANIZATION_REQUIRED",
          "Debes enviar la informacion de organization para crear el cliente fiscal."
        );
      }

      const regimen = await prisma.regimenFiscal.findFirst({
        where: {
          uuid: regimenFiscalUuid,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!regimen) {
        return sendApiError(res, 422, "REGIMEN_NOT_FOUND", "El regimen fiscal no existe.");
      }

      const duplicateRfc = await prisma.emisor.findFirst({
        where: {
          empresaId: req.auth.empresaId,
          rfc,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (duplicateRfc) {
        return sendApiError(res, 409, "EMISOR_DUPLICATE_RFC", "Ya existe un cliente con ese RFC.");
      }

      const created = await prisma.emisor.create({
        data: {
          empresaId: req.auth.empresaId,
          nombre,
          razonSocial,
          rfc,
          curp,
          regimenFiscalId: regimen.id,
          codigoPostal,
          calle,
          numeroExterior,
          numeroInterior,
          colonia,
          municipio,
          estado,
          pais: pais ?? "MEX",
          email,
          telefono,
        },
        select: {
          id: true,
          uuid: true,
          rfc: true,
          nombre: true,
        },
      });

      let syncResult: SyncResult;
      try {
        const syncSource = await loadEmisorForSync(created.id);
        syncResult = await syncEmisorWithFacturapi(syncSource, organizationInput);
        await persistSyncSuccess(created.id, syncResult);
      } catch (error) {
        await persistSyncError(created.id, error);

        await audit(prisma, {
          empresaId: req.auth.empresaId,
          usuarioId: req.auth.userId,
          module: ModuleCode.facturacion,
          action: "facturacion.emisor.sync_error",
          entity: "emisor",
          entityId: created.uuid,
          message: "Cliente creado localmente, pero Facturapi devolvio error.",
          meta: {
            rfc: created.rfc,
            facturapiError: toFacturapiErrorDetails(error),
          },
          ip: req.ip,
          userAgent: req.headers["user-agent"] ?? null,
        });

        return sendApiError(
          res,
          error instanceof ManagedError ? error.status : 422,
          error instanceof ManagedError ? error.code : "FACTURAPI_SYNC_ERROR",
          "Cliente creado localmente, pero Facturapi devolvio un error.",
          {
            emisorUuid: created.uuid,
            facturapi: toFacturapiErrorDetails(error),
          }
        );
      }

      try {
        await uploadAndPersistCsd({
          emisorId: created.id,
          userId: req.auth.userId,
          organizationId: syncResult.organization.id,
          cerFile,
          keyFile,
          csdPassword,
          replaceExisting: false,
        });
      } catch (error) {
        await persistSyncError(created.id, error);

        await audit(prisma, {
          empresaId: req.auth.empresaId,
          usuarioId: req.auth.userId,
          module: ModuleCode.facturacion,
          action: "facturacion.emisor.sync_error",
          entity: "emisor",
          entityId: created.uuid,
          message: "Cliente creado y sincronizado, pero no se pudo cargar el CSD.",
          meta: {
            rfc: created.rfc,
            facturapiError: toFacturapiErrorDetails(error),
          },
          ip: req.ip,
          userAgent: req.headers["user-agent"] ?? null,
        });

        return sendApiError(
          res,
          error instanceof ManagedError ? error.status : 422,
          error instanceof ManagedError ? error.code : "FACTURAPI_CSD_UPLOAD_ERROR",
          "Cliente creado y sincronizado, pero no se pudo cargar el CSD.",
          {
            emisorUuid: created.uuid,
            facturapi: toFacturapiErrorDetails(error),
          }
        );
      }

      const saved = await prisma.emisor.findUnique({
        where: {
          id: created.id,
        },
        select: emisorListSelect,
      });

      if (!saved) {
        return sendApiError(res, 409, "EMISOR_NOT_FOUND", "No se encontro el cliente recien creado.");
      }

      await audit(prisma, {
        empresaId: req.auth.empresaId,
        usuarioId: req.auth.userId,
        module: ModuleCode.facturacion,
        action: AuditActions.EMISOR_CREATE,
        entity: "emisor",
        entityId: created.uuid,
        message: "Se creo un nuevo cliente/emisor.",
        meta: {
          rfc: created.rfc,
          nombre: created.nombre,
          organizationConfigured: true,
          csdConfigured: true,
        },
        ip: req.ip,
        userAgent: req.headers["user-agent"] ?? null,
      });

      return res.status(201).json({
        message: "Cliente creado, sincronizado y con CSD cargado en Facturapi.",
        datos: mapEmisorForResponse(saved),
      });
    } catch (error) {
      return sendHandledError(res, error, "No se pudo crear el cliente.");
    }
  }

  static async updateEmisor(req: Request, res: Response) {
    if (!req.auth || !req.emisor) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    const body = parseMutationBody(req);
    if (!hasAtLeastOneField(body)) {
      return sendApiError(res, 422, "VALIDATION_ERROR", "Debes enviar al menos un campo a actualizar.");
    }

    const nombre = normalizeString(body.nombre);
    const razonSocial = normalizeString(body.razonSocial, { nullable: true });
    const rfc = normalizeString(body.rfc, { upper: true });
    const curp = normalizeString(body.curp, { upper: true, nullable: true });
    const regimenFiscalUuid = normalizeString(body.regimenFiscalUuid);
    const codigoPostal = normalizeString(body.codigoPostal);
    const calle = normalizeString(body.calle, { nullable: true });
    const numeroExterior = normalizeString(body.numeroExterior, { nullable: true });
    const numeroInterior = normalizeString(body.numeroInterior, { nullable: true });
    const colonia = normalizeString(body.colonia, { nullable: true });
    const municipio = normalizeString(body.municipio, { nullable: true });
    const estado = normalizeString(body.estado, { nullable: true });
    const pais = normalizeString(body.pais, { upper: true, nullable: true });
    const email = normalizeString(body.email, { lower: true, nullable: true });
    const telefono = normalizeString(body.telefono, { nullable: true });

    try {
      const organizationInput = normalizeOrganizationInput(body.organization);

      const existing = await prisma.emisor.findFirst({
        where: {
          id: req.emisor.id,
          empresaId: req.auth.empresaId,
          deletedAt: null,
        },
        select: {
          id: true,
          uuid: true,
          rfc: true,
          regimenFiscalId: true,
        },
      });

      if (!existing) {
        return sendApiError(res, 409, "EMISOR_NOT_FOUND", "No se encontro el cliente que deseas actualizar.");
      }

      let regimenFiscalId = existing.regimenFiscalId;
      if (regimenFiscalUuid) {
        const regimen = await prisma.regimenFiscal.findFirst({
          where: {
            uuid: regimenFiscalUuid,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

        if (!regimen) {
          return sendApiError(res, 422, "REGIMEN_NOT_FOUND", "El regimen fiscal no existe.");
        }

        regimenFiscalId = regimen.id;
      }

      const rfcToCheck = rfc ?? existing.rfc;
      if (rfcToCheck !== existing.rfc) {
        const duplicateRfc = await prisma.emisor.findFirst({
          where: {
            empresaId: req.auth.empresaId,
            rfc: rfcToCheck,
            deletedAt: null,
            NOT: {
              id: existing.id,
            },
          },
          select: {
            id: true,
          },
        });

        if (duplicateRfc) {
          return sendApiError(res, 409, "EMISOR_DUPLICATE_RFC", "Ya existe otro cliente con ese RFC.");
        }
      }

      await prisma.emisor.update({
        where: {
          id: existing.id,
        },
        data: {
          nombre: nombre ?? undefined,
          razonSocial,
          rfc: rfc ?? undefined,
          curp,
          regimenFiscalId,
          codigoPostal: codigoPostal ?? undefined,
          calle,
          numeroExterior,
          numeroInterior,
          colonia,
          municipio,
          estado,
          pais,
          email,
          telefono,
        },
      });

      const syncSource = await loadEmisorForSync(existing.id);
      const shouldSyncNow = Boolean(
        syncSource.facturapiOrg?.facturapiId || syncSource.facturapiCustomerId || organizationInput?.enabled
      );

      if (shouldSyncNow) {
        try {
          const syncResult = await syncEmisorWithFacturapi(syncSource, organizationInput);
          await persistSyncSuccess(existing.id, syncResult);
        } catch (error) {
          await persistSyncError(existing.id, error);

          await audit(prisma, {
            empresaId: req.auth.empresaId,
            usuarioId: req.auth.userId,
            module: ModuleCode.facturacion,
            action: "facturacion.emisor.sync_error",
            entity: "emisor",
            entityId: existing.uuid,
            message: "Cliente actualizado localmente, pero Facturapi devolvio error.",
            meta: {
              rfc: rfcToCheck,
              facturapiError: toFacturapiErrorDetails(error),
            },
            ip: req.ip,
            userAgent: req.headers["user-agent"] ?? null,
          });

          return sendApiError(
            res,
            error instanceof ManagedError ? error.status : 422,
            error instanceof ManagedError ? error.code : "FACTURAPI_SYNC_ERROR",
            "Cliente actualizado localmente, pero Facturapi devolvio un error.",
            {
              emisorUuid: existing.uuid,
              facturapi: toFacturapiErrorDetails(error),
            }
          );
        }
      } else {
        await persistOrganizationNotConfigured(existing.id);
      }

      const updated = await prisma.emisor.findUnique({
        where: {
          id: existing.id,
        },
        select: emisorListSelect,
      });

      if (!updated) {
        return sendApiError(res, 409, "EMISOR_NOT_FOUND", "No se encontro el cliente actualizado.");
      }

      await audit(prisma, {
        empresaId: req.auth.empresaId,
        usuarioId: req.auth.userId,
        module: ModuleCode.facturacion,
        action: "facturacion.emisor.update",
        entity: "emisor",
        entityId: existing.uuid,
        message: "Se actualizo el cliente/emisor.",
        meta: {
          rfc: updated.rfc,
          organizationConfigured: shouldSyncNow,
        },
        ip: req.ip,
        userAgent: req.headers["user-agent"] ?? null,
      });

      return res.status(200).json({
        message: shouldSyncNow
          ? "Cliente actualizado y sincronizado con Facturapi."
          : "Cliente actualizado sin organizacion de Facturapi. No podra generar facturas hasta configurarla.",
        datos: mapEmisorForResponse(updated),
      });
    } catch (error) {
      return sendHandledError(res, error, "No se pudo actualizar el cliente.");
    }
  }

  static async upsertEmisorCsd(req: Request, res: Response) {
    if (!req.auth || !req.emisor) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    const body = parseMutationBody(req);
    const csdPassword = normalizeString(body.csdPassword);
    const replaceCsd = normalizeBoolean(body.replaceCsd) ?? false;
    const { cer: cerFile, key: keyFile } = getUploadedCsdFiles(req);

    if (!cerFile || !keyFile || !csdPassword) {
      return sendApiError(
        res,
        422,
        "VALIDATION_ERROR",
        "Los campos cer, key y csdPassword son obligatorios para cargar CSD."
      );
    }

    try {
      const target = await prisma.emisor.findFirst({
        where: {
          id: req.emisor.id,
          empresaId: req.auth.empresaId,
          deletedAt: null,
        },
        select: {
          id: true,
          uuid: true,
          rfc: true,
          facturapiOrg: {
            select: {
              facturapiId: true,
            },
          },
        },
      });

      if (!target) {
        return sendApiError(res, 409, "EMISOR_NOT_FOUND", "No se encontro el cliente para cargar CSD.");
      }

      const organizationId = target.facturapiOrg?.facturapiId ?? null;
      if (!organizationId) {
        return sendApiError(
          res,
          422,
          "FACTURAPI_ORGANIZATION_REQUIRED",
          "Debes configurar la organizacion de Facturapi antes de cargar CSD."
        );
      }

      const csdResult = await uploadAndPersistCsd({
        emisorId: target.id,
        userId: req.auth.userId,
        organizationId,
        cerFile,
        keyFile,
        csdPassword,
        replaceExisting: replaceCsd,
      });

      await audit(prisma, {
        empresaId: req.auth.empresaId,
        usuarioId: req.auth.userId,
        module: ModuleCode.facturacion,
        action: "facturacion.emisor.csd_upsert",
        entity: "emisor",
        entityId: target.uuid,
        message: "Se cargo o reemplazo el CSD del cliente.",
        meta: {
          rfc: target.rfc,
          replaceCsd,
          serialNumber: csdResult.serialNumber,
          validTo: csdResult.validTo,
          cerPath: csdResult.localCerPath,
          keyPath: csdResult.localKeyPath,
        },
        ip: req.ip,
        userAgent: req.headers["user-agent"] ?? null,
      });

      return res.status(200).json({
        message: replaceCsd ? "CSD reemplazado correctamente." : "CSD cargado correctamente.",
      });
    } catch (error) {
      return sendHandledError(res, error, "No se pudo cargar el CSD.");
    }
  }

  static async deleteEmisorCsd(req: Request, res: Response) {
    if (!req.auth || !req.emisor) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    const body = parseMutationBody(req);
    const confirmation = normalizeBoolean(firstDefined(body as Record<string, unknown>, ["confirm", "confirmDelete"]));

    if (!confirmation) {
      return sendApiError(
        res,
        422,
        "CSD_DELETE_CONFIRMATION_REQUIRED",
        "Estas seguro que deseas eliminar los CSD."
      );
    }

    try {
      const target = await prisma.emisor.findFirst({
        where: {
          id: req.emisor.id,
          empresaId: req.auth.empresaId,
          deletedAt: null,
        },
        select: {
          id: true,
          uuid: true,
          rfc: true,
          facturapiOrg: {
            select: {
              facturapiId: true,
            },
          },
        },
      });

      if (!target) {
        return sendApiError(res, 409, "EMISOR_NOT_FOUND", "No se encontro el cliente para eliminar CSD.");
      }

      const organizationId = target.facturapiOrg?.facturapiId ?? null;
      if (!organizationId) {
        return sendApiError(
          res,
          422,
          "FACTURAPI_ORGANIZATION_REQUIRED",
          "No existe una organizacion de Facturapi configurada para este cliente."
        );
      }

      await deleteAndDeactivateCsd(target.id, organizationId);

      await audit(prisma, {
        empresaId: req.auth.empresaId,
        usuarioId: req.auth.userId,
        module: ModuleCode.facturacion,
        action: "facturacion.emisor.csd_delete",
        entity: "emisor",
        entityId: target.uuid,
        message: "Se elimino el CSD del cliente.",
        meta: {
          rfc: target.rfc,
        },
        ip: req.ip,
        userAgent: req.headers["user-agent"] ?? null,
      });

      return res.status(200).json({
        message: "CSD eliminado correctamente.",
      });
    } catch (error) {
      return sendHandledError(res, error, "No se pudo eliminar el CSD.");
    }
  }

  static async deleteEmisor(req: Request, res: Response) {
    if (!req.auth || !req.emisor) {
      return sendApiError(res, 401, "UNAUTHORIZED", "Sesion requerida.");
    }

    try {
      const target = await prisma.emisor.findFirst({
        where: {
          id: req.emisor.id,
          empresaId: req.auth.empresaId,
          deletedAt: null,
        },
        select: {
          id: true,
          uuid: true,
          nombre: true,
          rfc: true,
          facturapiCustomerId: true,
          facturapiOrg: {
            select: {
              facturapiId: true,
            },
          },
          apiKeys: {
            where: {
              env: "test",
              revokedAt: null,
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 1,
            select: {
              secretRef: true,
            },
          },
        },
      });

      if (!target) {
        return sendApiError(res, 409, "EMISOR_NOT_FOUND", "No se encontro el cliente que deseas eliminar.");
      }

      try {
        const hasFacturapiData = Boolean(target.facturapiCustomerId || target.facturapiOrg?.facturapiId);

        if (hasFacturapiData) {
          const adminClient = getFacturapiAdminClient();
          const organizationId = target.facturapiOrg?.facturapiId ?? null;

          let testApiKey = target.apiKeys[0]?.secretRef ? decryptApiKey(target.apiKeys[0].secretRef) : null;
          if (!testApiKey && organizationId) {
            testApiKey = await adminClient.organizations.getTestApiKey(organizationId);
          }

          if (target.facturapiCustomerId) {
            if (!testApiKey) {
              throw new ManagedError(
                "FACTURAPI_CUSTOMER_DELETE_ERROR",
                "No se pudo obtener una API key de pruebas para eliminar el cliente en Facturapi.",
                422
              );
            }

            const facturapiOrgClient = new Facturapi(testApiKey, { apiVersion: FACTURAPI_API_VERSION });
            await facturapiOrgClient.customers.del(target.facturapiCustomerId);
          }

          if (organizationId) {
            await adminClient.organizations.del(organizationId);
          }
        }
      } catch (error) {
        await persistSyncError(target.id, error);

        return sendApiError(
          res,
          error instanceof ManagedError ? error.status : 422,
          error instanceof ManagedError ? error.code : "FACTURAPI_DELETE_ERROR",
          "No se pudo eliminar el cliente en Facturapi.",
          {
            emisorUuid: target.uuid,
            facturapi: toFacturapiErrorDetails(error),
          }
        );
      }

      await prisma.$transaction(async (tx) => {
        const invoices = await tx.cfdiInvoice.findMany({
          where: {
            emisorId: target.id,
          },
          select: {
            id: true,
          },
        });

        if (invoices.length > 0) {
          await tx.cfdiInvoiceItem.deleteMany({
            where: {
              invoiceId: {
                in: invoices.map((invoice) => invoice.id),
              },
            },
          });
        }

        await tx.cfdiInvoice.deleteMany({ where: { emisorId: target.id } });
        await tx.sucursales.deleteMany({ where: { emisorId: target.id } });
        await tx.receptor.deleteMany({ where: { emisorId: target.id } });
        await tx.facturapiCertificate.deleteMany({ where: { emisorId: target.id } });
        await tx.facturapiApiKey.deleteMany({ where: { emisorId: target.id } });
        await tx.facturapiOrganization.deleteMany({ where: { emisorId: target.id } });
        await tx.emisor.delete({ where: { id: target.id } });
      });

      await audit(prisma, {
        empresaId: req.auth.empresaId,
        usuarioId: req.auth.userId,
        module: ModuleCode.facturacion,
        action: "facturacion.emisor.delete",
        entity: "emisor",
        entityId: target.uuid,
        message: "Se elimino el cliente/emisor.",
        meta: {
          rfc: target.rfc,
          nombre: target.nombre,
        },
        ip: req.ip,
        userAgent: req.headers["user-agent"] ?? null,
      });

      return res.status(200).json({
        message: "Cliente eliminado correctamente.",
      });
    } catch (error) {
      return sendApiError(res, 500, "INTERNAL_SERVER_ERROR", "No se pudo eliminar el cliente.", error);
    }
  }
}
