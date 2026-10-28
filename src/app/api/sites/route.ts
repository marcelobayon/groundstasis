import { NextResponse } from "next/server";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link";
import { getMagicLinkSecrets } from "@/lib/env";
import { getSiteRepository } from "@/lib/db/repository";
import { validatePolygon } from "@/lib/geo/validate";
import { polygonAreaAcres } from "@/lib/geo/area";
import { assessSuitability } from "@/lib/geo/suitability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Create a monitored site. Authenticated by the magic-link token emailed after
// checkout (scope "site:create"). Entitlement is enforced in the repository —
// a user can only create as many sites as their subscription allows.
export async function POST(request: Request) {
  const repo = getSiteRepository();
  if (!repo) {
    return NextResponse.json({ error: "database not configured" }, { status: 503 });
  }

  let body: {
    token?: string;
    name?: string;
    address?: string;
    geometry?: unknown;
    loanAmount?: number;
    loanNumber?: string;
    constructionStart?: string;
    constructionEnd?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // --- auth ---
  const token = body.token ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const auth = token ? verifyMagicLinkToken(token, getMagicLinkSecrets()) : ({ valid: false, reason: "missing token" } as const);
  if (!auth.valid) {
    return NextResponse.json({ error: `unauthorized: ${auth.reason}` }, { status: 401 });
  }
  const userId = auth.payload.sub;

  // --- validate input ---
  if (!body.name || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const geomCheck = validatePolygon(body.geometry);
  if (!geomCheck.valid) {
    return NextResponse.json({ error: "invalid geometry", details: geomCheck.errors }, { status: 400 });
  }
  const geometry = body.geometry as Parameters<typeof polygonAreaAcres>[0];
  const areaAcres = polygonAreaAcres(geometry);
  const suit = assessSuitability(geometry);
  if (suit.suitability === "INSUFFICIENT") {
    return NextResponse.json(
      { error: "site too small for reliable 10 m-class analysis", suitability: suit },
      { status: 422 }
    );
  }

  // --- create (entitlement enforced in the repository) ---
  try {
    const site = await repo.createSite({
      userId,
      name: body.name.trim(),
      address: body.address,
      geometryGeojson: body.geometry,
      areaAcres,
      loanAmount: body.loanAmount,
      loanNumber: body.loanNumber,
      constructionStart: body.constructionStart,
      constructionEnd: body.constructionEnd,
    });
    return NextResponse.json({ ok: true, siteId: site.id, areaAcres, suitability: suit.suitability });
  } catch (err) {
    const message = err instanceof Error ? err.message : "could not create site";
    // entitlement failures (no active sub / seat limit) -> 402 Payment Required
    const isEntitlement = /subscription|limit/i.test(message);
    return NextResponse.json({ error: message }, { status: isEntitlement ? 402 : 500 });
  }
}
