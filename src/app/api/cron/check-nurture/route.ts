import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/env";
import { runCheckNurture } from "@/lib/jobs/check-nurture";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cron/check-nurture — sends the post-check nurture sequence (emails
// 1 and 2) to recent $9-check buyers, idempotent per email + stage. Admin-gated
// (x-admin-secret); invoked daily by netlify/functions/scheduled-check-nurture.ts.
export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdmin(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await runCheckNurture();
  return NextResponse.json(summary);
}
