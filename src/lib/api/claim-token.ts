import { randomBytes, createHash } from "node:crypto";

// One-time credential-claim token. The token is a high-entropy random secret
// handed to the buyer (in the claim URL); ONLY its SHA-256 hash is persisted on
// the CredentialIssuance row — same storage discipline as API keys. Single-use,
// expiry, and supersession (replacement) are enforced in the DB layer against
// that hash, never by the token itself. No raw API key is ever generated or
// stored here; the key is minted at claim time.

const CLAIM_PREFIX = "gsclaim_";
const TOKEN_BYTES = 32; // 256 bits of entropy

/** 24h, per product decision. */
export const CLAIM_TTL_MS = 24 * 60 * 60 * 1000;

export interface GeneratedClaimToken {
  /** Shown once, in the claim URL. Never persisted. */
  token: string;
  /** SHA-256 hex digest — the only form persisted. */
  tokenHash: string;
}

export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function generateClaimToken(): GeneratedClaimToken {
  const token = `${CLAIM_PREFIX}${randomBytes(TOKEN_BYTES).toString("hex")}`;
  return { token, tokenHash: hashClaimToken(token) };
}

export function looksLikeClaimToken(token: string): boolean {
  return token.startsWith(CLAIM_PREFIX) && token.length >= CLAIM_PREFIX.length + 40;
}

export function claimExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + CLAIM_TTL_MS);
}

export function isClaimExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now.getTime() > expiresAt.getTime();
}
