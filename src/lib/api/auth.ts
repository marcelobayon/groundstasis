// API v1 authentication: resolve + authorize an API key from the request.
// Tenant isolation and scope checks happen here, at the service boundary — not
// in the UI. Never logs the key or its hash.

import { parseApiKey, hashApiKey, hasScope, type ApiScope } from "./keys";
import { findApiKeyByHash, touchApiKeyLastUsed, apiStoreAvailable } from "./store";

export interface AuthContext {
  userId: string;
  apiKeyId: string;
  scopes: string[];
}

export type AuthResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; code: "unauthorized" | "forbidden" | "server_error"; message: string };

export async function authenticate(request: Request, requiredScope?: ApiScope): Promise<AuthResult> {
  if (!apiStoreAvailable()) {
    return { ok: false, code: "server_error", message: "API is not configured." };
  }

  const raw =
    parseApiKey(request.headers.get("authorization")) ?? parseApiKey(request.headers.get("x-api-key"));
  if (!raw) {
    return { ok: false, code: "unauthorized", message: "Missing or malformed API key." };
  }

  const key = await findApiKeyByHash(hashApiKey(raw));
  if (!key || key.revokedAt) {
    return { ok: false, code: "unauthorized", message: "Invalid or revoked API key." };
  }

  if (requiredScope && !hasScope(key.scopes, requiredScope)) {
    return { ok: false, code: "forbidden", message: `This key lacks the required scope: ${requiredScope}.` };
  }

  // Best-effort last-used stamp; never block or fail the request on it.
  void touchApiKeyLastUsed(key.id).catch(() => {});

  return { ok: true, ctx: { userId: key.userId, apiKeyId: key.id, scopes: key.scopes } };
}
