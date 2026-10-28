import { NextResponse } from "next/server";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link";
import { getMagicLinkSecrets } from "@/lib/env";
import { getSiteRepository } from "@/lib/db/repository";
import { getSatelliteProvider } from "@/lib/satellite";
import { analyzeSite } from "@/lib/jobs/analyze-site";
import { compareMilestoneToEvidence, MILESTONE_STAGES, type MilestoneStage } from "@/lib/cdi/findings";
import type { GeoJSONPolygon } from "@/lib/geo/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Secure per-site CDI workspace API. Auth is a site-scoped magic-link token
// (sub = siteId, scope = "site:workspace"), so a customer can only read/write
// the one site their emailed link grants — never another customer's site.
//   GET  -> workspace state (site, entitlement, milestone, latest finding)
//   POST -> save milestone (+ enable CDI if entitled), compute a fresh finding

function authSiteId(token: string): { siteId: string } | { error: string; status: number } {
  const auth = verifyMagicLinkToken(decodeURIComponent(token), getMagicLinkSecrets());
  if (!auth.valid) return { error: `unauthorized: ${auth.reason}`, status: 401 };
  if (auth.payload.scope !== "site:workspace") return { error: "wrong link scope", status: 403 };
  return { siteId: auth.payload.sub };
}

const VALID_STAGES = new Set<string>(MILESTONE_STAGES.map((s) => s.value));

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const repo = getSiteRepository();
  if (!repo) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  const a = authSiteId(params.token);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });

  const ws = await repo.getSiteWorkspace(a.siteId);
  if (!ws) return NextResponse.json({ error: "site not found" }, { status: 404 });

  return NextResponse.json({
    site: ws.site,
    entitlement: ws.entitlement,
    milestone: ws.milestone,
    finding: (ws.milestone?.lastFindingJson as unknown) ?? null,
    liveUnavailable: getSatelliteProvider().isDemo,
  });
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const repo = getSiteRepository();
  if (!repo) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  const a = authSiteId(params.token);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const siteId = a.siteId;

  let body: {
    reportedStage?: string;
    expectedMilestone?: string;
    targetDate?: string;
    actualStageReported?: string;
    drawReference?: string;
    drawAmount?: number;
    note?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    /* empty */
  }

  // CDI must be enabled on this site (enforces the owner's seat entitlement).
  const enable = await repo.setSiteDrawIntelligence(siteId, true);
  if (!enable.ok) {
    return NextResponse.json({ error: enable.reason ?? "Draw Intelligence is not available for this site." }, { status: 402 });
  }

  const stage = (body.reportedStage && VALID_STAGES.has(body.reportedStage) ? body.reportedStage : "UNKNOWN") as MilestoneStage;
  const targetDate = body.targetDate ? new Date(body.targetDate) : null;
  const milestone = await repo.upsertMilestone(siteId, {
    reportedStage: stage,
    expectedMilestone: body.expectedMilestone?.trim() || null,
    targetDate: targetDate && !Number.isNaN(targetDate.getTime()) ? targetDate : null,
    actualStageReported: body.actualStageReported?.trim() || null,
    drawReference: body.drawReference?.trim() || null,
    drawAmount: typeof body.drawAmount === "number" && Number.isFinite(body.drawAmount) ? body.drawAmount : null,
    note: body.note?.trim() || null,
  });

  // Compute a fresh finding on save (one live read), matching the $9-check
  // pattern — unless live imagery isn't configured, in which case we save the
  // milestone and let the monitoring cycle produce the finding.
  const provider = getSatelliteProvider();
  let finding: unknown = milestone.lastFindingJson ?? null;
  if (!provider.isDemo) {
    const ps = await repo.getProviderSite(siteId);
    if (ps) {
      const now = new Date();
      const from = new Date(now);
      from.setMonth(from.getMonth() - 18);
      try {
        const result = await analyzeSite({
          site: { id: siteId, name: ps.name, geometry: ps.geometry as GeoJSONPolygon, areaAcres: ps.areaAcres ?? undefined },
          siteName: ps.name,
          previousStatus: null,
          range: { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) },
          now,
          provider,
        });
        const f = compareMilestoneToEvidence(
          {
            reportedStage: stage,
            expectedMilestone: milestone.expectedMilestone,
            targetDate: milestone.targetDate,
            actualStageReported: milestone.actualStageReported,
          },
          result.evaluation,
          { now }
        );
        await repo.saveCdiFinding(siteId, { code: f.code, json: f });
        finding = f;
      } catch {
        // leave the previously stored finding; the scheduled run will refresh it
      }
    }
  }

  return NextResponse.json({ ok: true, milestone, finding, liveUnavailable: provider.isDemo });
}
