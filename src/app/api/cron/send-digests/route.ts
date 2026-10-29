import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/env";
import { runWeeklyDigests } from "@/lib/jobs/send-digests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cron/send-digests — sends the weekly portfolio digest to every
// monitoring customer (idempotent per ISO week). Admin-gated (x-admin-secret),
// same as /api/analyze and /api/cron/deliver-webhooks; invoked by the Netlify
// scheduled function netlify/functions/scheduled-weekly-digest.ts.
export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdmin(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await runWeeklyDigests();
  return NextResponse.json(summary);
}
