import { NextResponse } from "next/server";
import { verifyAccountToken } from "@/lib/account/session";
import { apiStoreAvailable, createApiKey, listApiKeys } from "@/lib/api/store";
import { generateApiKey, isApiScope } from "@/lib/api/keys";
import { errorBody, ERROR_STATUS } from "@/lib/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Account-authenticated API-key management (not API-key authenticated — this is
// the owner managing their own keys from the signed-in dashboard).

// POST: mint a key. Returns the plaintext ONCE; only the hash is stored.
export async function POST(request: Request): Promise<NextResponse> {
  if (!apiStoreAvailable()) {
    return NextResponse.json(errorBody("server_error", "API is not configured."), { status: ERROR_STATUS.server_error });
  }
  let body: { token?: string; name?: string; scopes?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(errorBody("invalid_request", "Invalid JSON."), { status: ERROR_STATUS.invalid_request });
  }
  const userId = verifyAccountToken(body.token);
  if (!userId) {
    return NextResponse.json(errorBody("unauthorized", "Please sign in again."), { status: ERROR_STATUS.unauthorized });
  }
  const scopes = (Array.isArray(body.scopes) ? body.scopes : []).filter(isApiScope);
  if (scopes.length === 0) {
    return NextResponse.json(errorBody("invalid_request", "Select at least one valid scope."), { status: ERROR_STATUS.invalid_request });
  }
  const name = ((body.name ?? "").trim() || "API key").slice(0, 80);
  const gen = generateApiKey();
  const row = await createApiKey({ userId, name, prefix: gen.prefix, hashedKey: gen.hashedKey, scopes });
  // plaintext is returned exactly once, here.
  return NextResponse.json({ id: row.id, name: row.name, prefix: row.prefix, scopes: row.scopes, plaintext: gen.plaintext });
}

// GET: list the caller's active keys (never the hash or plaintext).
export async function GET(request: Request): Promise<NextResponse> {
  if (!apiStoreAvailable()) {
    return NextResponse.json(errorBody("server_error", "API is not configured."), { status: ERROR_STATUS.server_error });
  }
  const token = new URL(request.url).searchParams.get("token");
  const userId = verifyAccountToken(token);
  if (!userId) {
    return NextResponse.json(errorBody("unauthorized", "Please sign in again."), { status: ERROR_STATUS.unauthorized });
  }
  const keys = (await listApiKeys(userId))
    .filter((k) => !k.revokedAt)
    .map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      scopes: k.scopes,
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      createdAt: k.createdAt ? k.createdAt.toISOString() : null,
    }));
  return NextResponse.json({ keys });
}
