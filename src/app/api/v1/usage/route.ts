import { NextResponse } from "next/server";
import { authenticate } from "@/lib/api/auth";
import { checkRateLimit, meter } from "@/lib/api/meter";
import { usageTotalSince } from "@/lib/api/store";
import { errorBody, ERROR_STATUS } from "@/lib/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/v1/usage — month-to-date request total + rate-limit headroom for the
// authenticated key. Scope: usage:read.

function startOfMonthUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticate(request, "usage:read");
  if (!auth.ok) {
    return NextResponse.json(errorBody(auth.code, auth.message), { status: ERROR_STATUS[auth.code] });
  }

  const rl = await checkRateLimit(auth.ctx.apiKeyId);
  if (!rl.allowed) {
    await meter({
      userId: auth.ctx.userId,
      apiKeyId: auth.ctx.apiKeyId,
      operation: "usage.read",
      outcome: "rate_limited",
      route: "/api/v1/usage",
      status: 429,
    });
    return NextResponse.json(errorBody("rate_limited", "Rate limit exceeded. Try again shortly."), {
      status: ERROR_STATUS.rate_limited,
    });
  }

  try {
    const periodStart = startOfMonthUTC();
    const total = await usageTotalSince(auth.ctx.userId, periodStart);
    await meter({
      userId: auth.ctx.userId,
      apiKeyId: auth.ctx.apiKeyId,
      operation: "usage.read",
      outcome: "success",
      route: "/api/v1/usage",
      status: 200,
    });
    return NextResponse.json({
      period: { start: periodStart.toISOString(), interval: "month_to_date" },
      usage: { total_requests: total },
      rate_limit: { per_minute: rl.limit, remaining: rl.remaining },
    });
  } catch {
    await meter({
      userId: auth.ctx.userId,
      apiKeyId: auth.ctx.apiKeyId,
      operation: "usage.read",
      outcome: "server_error",
      route: "/api/v1/usage",
      status: 500,
    });
    return NextResponse.json(errorBody("server_error", "Could not read usage."), {
      status: ERROR_STATUS.server_error,
    });
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(errorBody("method_not_allowed", "Use GET."), {
    status: ERROR_STATUS.method_not_allowed,
  });
}
