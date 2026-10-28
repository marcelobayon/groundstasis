import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/env";
import { runDemoAnalysis } from "@/lib/jobs/demo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Internal analysis endpoint. In production this iterates sites that are due for
// analysis (from the DB) and runs analyzeSite() for each. In the MVP it runs the
// DEMO site so the loop is exercisable end-to-end without a database.
//
// Protected by ADMIN_SECRET (header `x-admin-secret`). The Netlify scheduled
// function calls this on a cron. Idempotent by construction (see analyzeSite).
async function handle(request: Request): Promise<NextResponse> {
  const secret = request.headers.get("x-admin-secret");
  if (!isAdmin(secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runDemoAnalysis({});
  return NextResponse.json({
    ok: true,
    note: "DEMO analysis run. Wire getSitesDueForAnalysis() to your DB for production.",
    status: result.evaluation.status,
    score: result.evaluation.stasis.score,
    confidence: result.evaluation.confidence.level,
    alerts: result.alerts.map((a) => a.type),
    emailsSent: result.emailsSent.map((e) => ({ type: e.type, delivered: e.result.delivered })),
    run: result.run,
  });
}

export async function POST(request: Request) {
  return handle(request);
}
export async function GET(request: Request) {
  return handle(request);
}
