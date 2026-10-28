import { NextResponse } from "next/server";
import { verifyAccountToken } from "@/lib/account/session";
import { webhookStoreAvailable, disableWebhookEndpoint } from "@/lib/api/webhooks/store";
import { errorBody, ERROR_STATUS } from "@/lib/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST: disable one of the caller's endpoints. disableWebhookEndpoint enforces ownership.
export async function POST(request: Request): Promise<NextResponse> {
  if (!webhookStoreAvailable()) {
    return NextResponse.json(errorBody("server_error", "API is not configured."), { status: ERROR_STATUS.server_error });
  }
  let body: { token?: string; id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(errorBody("invalid_request", "Invalid JSON."), { status: ERROR_STATUS.invalid_request });
  }
  const userId = verifyAccountToken(body.token);
  if (!userId) {
    return NextResponse.json(errorBody("unauthorized", "Please sign in again."), { status: ERROR_STATUS.unauthorized });
  }
  if (!body.id) {
    return NextResponse.json(errorBody("invalid_request", "Missing endpoint id."), { status: ERROR_STATUS.invalid_request });
  }
  const ok = await disableWebhookEndpoint(userId, body.id);
  if (!ok) {
    return NextResponse.json(errorBody("not_found", "Endpoint not found."), { status: ERROR_STATUS.not_found });
  }
  return NextResponse.json({ ok: true });
}
