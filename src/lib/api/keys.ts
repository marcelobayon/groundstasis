// API v1 key primitives. PURE (node:crypto only) so the security-critical logic
// is unit-tested in isolation and has no Prisma/Next dependency.
//
// Key format:  gs_live_<40 base62 chars>
//   • The full plaintext is shown to the user exactly once, at creation.
//   • Only the SHA-256 hash is stored (hashedKey). Lookups hash the presented
//     key and match by hash — the secret is never stored or logged.
//   • `prefix` (gs_live_ + 8 chars) is safe to display in key lists.

import { randomBytes, createHash } from "node:crypto";

export type ApiScope = "checks:write" | "sites:read" | "sites:write" | "usage:read" | "webhooks:manage";

export const API_SCOPES: readonly ApiScope[] = [
  "checks:write",
  "sites:read",
  "sites:write",
  "usage:read",
  "webhooks:manage",
] as const;

const KEY_PREFIX = "gs_live_";
const SECRET_LEN = 40; // base62 chars of entropy
const PREFIX_DISPLAY_LEN = KEY_PREFIX.length + 8;

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function base62(buf: Buffer): string {
  let out = "";
  for (const byte of buf) out += BASE62[byte % 62];
  return out;
}

export interface GeneratedApiKey {
  /** Shown to the user once; never persisted. */
  plaintext: string;
  /** Safe-to-display fragment stored for key lists, e.g. "gs_live_AB12cd34". */
  prefix: string;
  /** SHA-256 hex digest of the plaintext; the only form persisted. */
  hashedKey: string;
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const secret = base62(randomBytes(SECRET_LEN));
  const plaintext = `${KEY_PREFIX}${secret}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, PREFIX_DISPLAY_LEN),
    hashedKey: hashApiKey(plaintext),
  };
}

export function looksLikeApiKey(token: string): boolean {
  return token.startsWith(KEY_PREFIX) && token.length >= KEY_PREFIX.length + 24;
}

/** Pull the raw key out of an `Authorization: Bearer …` or `x-api-key` value. */
export function parseApiKey(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const raw = headerValue.replace(/^Bearer\s+/i, "").trim();
  return looksLikeApiKey(raw) ? raw : null;
}

export function isApiScope(value: string): value is ApiScope {
  return (API_SCOPES as readonly string[]).includes(value);
}

export function hasScope(scopes: readonly string[], required: ApiScope): boolean {
  return scopes.includes(required);
}
