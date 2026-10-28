import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/env";
import { runWebhookDeliveries } from "@/lib/jobs/deliver-webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cron/deliver-webhooks — drains the delivery outbox. Admin-gated
// (x-admin-secret), same as /api/analyze; invoked by the Netlify scheduled
// function netlify/functions/scheduled-webhook-delivery.ts.
export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdmin(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await runWebhookDeliveries();
  return NextResponse.json(summary);
}
