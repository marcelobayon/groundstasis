import { NextResponse } from "next/server";
import { verifyAccountToken } from "@/lib/account/session";
import { webhookStoreAvailable, createWebhookEndpoint, listWebhookEndpoints } from "@/lib/api/webhooks/store";
import { validateWebhookUrl } from "@/lib/api/webhooks/ssrf";
import { isWebhookEvent } from "@/lib/api/webhooks/events";
import { encryptSecret, generateWebhookSecret } from "@/lib/api/webhooks/secret-crypto";
import { getWebhookEncKey } from "@/lib/env";
import { errorBody, ERROR_STATUS } from "@/lib/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Account-authenticated webhook endpoint management.

// POST: register an endpoint. The signing secret is generated here, encrypted
// at rest, and returned in plaintext exactly once.
export async function POST(request: Request): Promise<NextResponse> {
  if (!webhookStoreAvailable()) {
    return NextResponse.json(errorBody("server_error", "API is not configured."), { status: ERROR_STATUS.server_error });
  }
  const encKey = getWebhookEncKey();
  if (!encKey) {
    return NextResponse.json(errorBody("server_error", "Webhooks are not configured (missing encryption key)."), {
      status: ERROR_STATUS.server_error,
    });
  }
  let body: { token?: string; url?: string; events?: string[]; description?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(errorBody("invalid_request", "Invalid JSON."), { status: ERROR_STATUS.invalid_request });
  }
  const userId = verifyAccountToken(body.token);
  if (!userId) {
    return NextResponse.json(errorBody("unauthorized", "Please sign in again."), { status: ERROR_STATUS.unauthorized });
  }
  const v = validateWebhookUrl((body.url ?? "").trim());
  if (!v.ok) {
    return NextResponse.json(errorBody("invalid_request", `Invalid URL: ${v.reason}.`), {
      status: ERROR_STATUS.invalid_request,
    });
  }
  const events = (Array.isArray(body.events) ? body.events : []).filter(isWebhookEvent);
  if (events.length === 0) {
    return NextResponse.json(errorBody("invalid_request", "Select at least one event."), {
      status: ERROR_STATUS.invalid_request,
    });
  }
  try {
    const secret = generateWebhookSecret();
    const row = await createWebhookEndpoint({
      userId,
      url: v.url.toString(),
      secretCipher: encryptSecret(secret, encKey),
      events,
      description: ((body.description ?? "").trim().slice(0, 120)) || null,
    });
    // secret (plaintext) returned exactly once.
    return NextResponse.json({ id: row.id, url: row.url, events: row.events, active: row.active, secret });
  } catch {
    return NextResponse.json(
      errorBody("server_error", "Could not create the endpoint. The webhook tables may not be migrated yet."),
      { status: ERROR_STATUS.server_error },
    );
  }
}

// GET: list the caller's endpoints (never the secret).
export async function GET(request: Request): Promise<NextResponse> {
  if (!webhookStoreAvailable()) {
    return NextResponse.json(errorBody("server_error", "API is not configured."), { status: ERROR_STATUS.server_error });
  }
  const token = new URL(request.url).searchParams.get("token");
  const userId = verifyAccountToken(token);
  if (!userId) {
    return NextResponse.json(errorBody("unauthorized", "Please sign in again."), { status: ERROR_STATUS.unauthorized });
  }
  try {
    const rows = await listWebhookEndpoints(userId);
    return NextResponse.json({
      endpoints: rows.map((r) => ({
        id: r.id,
        url: r.url,
        events: r.events,
        active: r.active,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ endpoints: [] });
  }
}
