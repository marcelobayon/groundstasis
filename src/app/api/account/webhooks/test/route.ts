import { NextResponse } from "next/server";
import { verifyAccountToken } from "@/lib/account/session";
import { webhookStoreAvailable, getWebhookEndpoint, enqueueDelivery } from "@/lib/api/webhooks/store";
import { errorBody, ERROR_STATUS } from "@/lib/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST: enqueue a synthetic delivery to one of the caller's endpoints so they
// can verify signing + reachability before any real event fires. The scheduled
// worker delivers it on its next tick.
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
  const ep = await getWebhookEndpoint(userId, body.id);
  if (!ep) {
    return NextResponse.json(errorBody("not_found", "Endpoint not found."), { status: ERROR_STATUS.not_found });
  }
  const event = ep.events[0] ?? "site.status_changed";
  await enqueueDelivery({
    endpointId: ep.id,
    event,
    payload: {
      site_id: "test_site",
      site_name: "Test Site",
      status: "ACTIVE",
      stasis_score: 80,
      confidence: "HIGH",
      observed_at: new Date().toISOString(),
    },
  });
  return NextResponse.json({ queued: true });
}
