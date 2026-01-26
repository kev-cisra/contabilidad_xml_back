import { createHash, randomBytes } from "node:crypto";

const FIVE_DAYS_IN_MS = 5 * 24 * 60 * 60 * 1000;

export interface GeneratedToken {
  token: string;
  secretHash: string;
  expiresAt: Date;
}

export function generateSessionToken(): GeneratedToken {
  const token = randomBytes(48).toString('hex');
  const secretHash = hashToken(token);
  const expiresAt = new Date(Date.now() + FIVE_DAYS_IN_MS);

  return { token, secretHash, expiresAt };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}