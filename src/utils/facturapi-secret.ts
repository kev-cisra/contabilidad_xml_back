import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const SECRET_PREFIX = "enc:v1";

export class FacturapiSecretError extends Error {
  readonly code: "MISSING_CIPHER_KEY" | "INVALID_PAYLOAD" | "DECRYPT_ERROR";

  constructor(code: "MISSING_CIPHER_KEY" | "INVALID_PAYLOAD" | "DECRYPT_ERROR", message: string) {
    super(message);
    this.name = "FacturapiSecretError";
    this.code = code;
  }
}

function getCipherKey(): Buffer {
  const rawSecret = process.env.FACTURAPI_KEYS_ENCRYPTION_KEY?.trim();
  if (!rawSecret) {
    throw new FacturapiSecretError(
      "MISSING_CIPHER_KEY",
      "No se encontro FACTURAPI_KEYS_ENCRYPTION_KEY para cifrar llaves de Facturapi."
    );
  }

  return createHash("sha256").update(rawSecret, "utf8").digest();
}

export function encryptFacturapiSecret(secret: string): string {
  const key = getCipherKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    SECRET_PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptFacturapiSecret(secret: string): string {
  if (!secret.startsWith(`${SECRET_PREFIX}:`)) {
    return secret;
  }

  const parts = secret.split(":");
  if (parts.length !== 4) {
    throw new FacturapiSecretError("INVALID_PAYLOAD", "El payload cifrado de Facturapi no tiene formato valido.");
  }

  const iv = Buffer.from(parts[1], "base64url");
  const authTag = Buffer.from(parts[2], "base64url");
  const encrypted = Buffer.from(parts[3], "base64url");

  try {
    const key = getCipherKey();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    throw new FacturapiSecretError(
      "DECRYPT_ERROR",
      "No se pudo descifrar la llave de Facturapi almacenada localmente."
    );
  }
}
