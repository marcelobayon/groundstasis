import { NextResponse, type NextRequest } from "next/server";

// Best-effort rate limiting for the sensitive public sign-in endpoint.
//
// This runs in Edge middleware with an in-memory window. Edge isolates are
// ephemeral and distributed, so this blunts rapid abuse from a single source
// rather than guaranteeing a hard global cap. For a strict global limit, back
// it with a shared store (e.g. Upstash Redis) later — this is the "better than
// nothing / no new dependency" version, scoped to /api/magic-link only.

const WINDOW_MS = 10 * 60_000; // 10 minutes
const MAX_PER_WINDOW = 5; // sign-in link requests per IP per window

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function overLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > MAX_PER_WINDOW;
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-nf-client-connection-ip") || "unknown";
}

export function middleware(req: NextRequest): NextResponse {
  if (req.method === "POST" && req.nextUrl.pathname === "/api/magic-link") {
    if (overLimit("magic-link:" + clientIp(req))) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }
  }
  return NextResponse.next();
}

// Scope the middleware to the sign-in endpoint only (no overhead elsewhere).
export const config = {
  matcher: ["/api/magic-link"],
};
