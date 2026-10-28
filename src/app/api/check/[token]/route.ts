import { NextResponse } from "next/server";
import { getSiteRepository } from "@/lib/db/repository";
import { getSatelliteProvider } from "@/lib/satellite";
import { analyzeSite } from "@/lib/jobs/analyze-site";
import { geocodeAddress } from "@/lib/geo/geocode";
import { squarePolygonAroundPoint, clampAcres } from "@/lib/geo/box";
import { validatePolygon } from "@/lib/geo/validate";
import { assessSuitability } from "@/lib/geo/suitability";
import { polygonAreaAcres } from "@/lib/geo/area";
import {
  getEmailProvider,
  getEmailFrom,
  renderCheckResult,
} from "@/lib/email";
import type { SiteEvaluation } from "@/lib/analysis/types";
import type { GeoJSONPolygon } from "@/lib/geo/types";
import type { CheckResultDTO, CheckStatusResponse } from "@/lib/check/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The $9 single-site check backend.
//   GET  -> status (polled by the results page while payment finalizes)
//   POST -> run the ONE paid satellite read, store + return the result
//
// Idempotent: once analyzed, POST returns the stored result and never burns a
// second satellite call. FAIL-SAFE: with no live provider configured we refuse
// rather than pass DEMO data off as a paid result.

function appUrl(): string {
  return process.env.APP_URL ?? "https://groundstasis.com";
}

function dtoFromResultJson(resultJson: unknown): CheckResultDTO | undefined {
  if (resultJson && typeof resultJson === "object" && "dto" in (resultJson as Record<string, unknown>)) {
    return (resultJson as { dto: CheckResultDTO }).dto;
  }
  return undefined;
}

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const repo = getSiteRepository();
  if (!repo) return NextResponse.json({ found: false, paid: false, analyzed: false } as CheckStatusResponse);

  const token = decodeURIComponent(params.token);
  const row = await repo.getSiteCheckByToken(token);
  if (!row) return NextResponse.json({ found: false, paid: false, analyzed: false } as CheckStatusResponse);

  const analyzed = Boolean(row.analyzedAt);
  const body: CheckStatusResponse = {
    found: true,
    paid: row.paid,
    analyzed,
    result: analyzed ? dtoFromResultJson(row.resultJson) : undefined,
    site: { siteName: row.siteName, address: row.address, areaAcres: row.areaAcres },
    liveUnavailable: getSatelliteProvider().isDemo,
  };
  return NextResponse.json(body);
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const repo = getSiteRepository();
  if (!repo) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const token = decodeURIComponent(params.token);
  const row = await repo.getSiteCheckByToken(token);
  if (!row) return NextResponse.json({ error: "This check link is not valid." }, { status: 404 });
  if (!row.paid) return NextResponse.json({ error: "Payment hasn't been confirmed yet." }, { status: 402 });

  // Already analysed → return the stored result (no second satellite call).
  if (row.analyzedAt) {
    const dto = dtoFromResultJson(row.resultJson);
    return NextResponse.json({ analyzed: true, result: dto });
  }

  const provider = getSatelliteProvider();
  if (provider.isDemo) {
    return NextResponse.json(
      { error: "Live satellite analysis isn't enabled in this environment yet. Your check is saved — try again shortly." },
      { status: 503 }
    );
  }

  let body: { address?: string; lat?: number; lng?: number; acres?: number; siteName?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty */
  }

  // Resolve a point: explicit coordinates win; otherwise geocode the address.
  let lat = typeof body.lat === "number" ? body.lat : NaN;
  let lng = typeof body.lng === "number" ? body.lng : NaN;
  const address = (body.address ?? "").trim();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    if (!address) {
      return NextResponse.json({ error: "Enter the site address or coordinates." }, { status: 400 });
    }
    const geo = await geocodeAddress(address);
    if (!geo) {
      return NextResponse.json(
        { error: "We couldn't locate that address. Paste coordinates instead (e.g. 41.8781, -87.6298)." },
        { status: 422 }
      );
    }
    lat = geo.lat;
    lng = geo.lng;
  }

  const acres = clampAcres(typeof body.acres === "number" ? body.acres : 5);
  const geometry: GeoJSONPolygon = squarePolygonAroundPoint(lat, lng, acres);

  const v = validatePolygon(geometry);
  if (!v.valid) {
    return NextResponse.json({ error: `Could not build a valid site boundary: ${v.errors.join(" ")}` }, { status: 400 });
  }
  const suit = assessSuitability(geometry);
  const areaAcres = polygonAreaAcres(geometry);
  const siteName = (body.siteName ?? "").trim() || address || "Site check";

  // Persist the entered site, then run the single read.
  await repo.saveSiteCheckSite(token, {
    siteName,
    address: address || undefined,
    latitude: lat,
    longitude: lng,
    areaAcres,
    geometryGeojson: geometry,
  });

  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 18);

  let result: Awaited<ReturnType<typeof analyzeSite>>;
  try {
    result = await analyzeSite({
      site: { id: token, name: siteName, geometry, areaAcres },
      siteName,
      previousStatus: null,
      range: { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) },
      now,
      provider,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The satellite analysis failed. Your check is saved — try again shortly." },
      { status: 502 }
    );
  }

  const dto = toDto(result.evaluation, {
    siteName,
    address: address || null,
    areaAcres,
    suitability: suit.suitability,
    isDemo: provider.isDemo,
  });

  await repo.saveSiteCheckResult(token, {
    status: result.evaluation.status,
    stasisScore: result.evaluation.stasis.score,
    confidence: result.evaluation.confidence.level,
    provider: result.run.provider,
    resultJson: { dto, evaluation: result.evaluation },
  });

  // Best-effort second touch: email the result + the $19/mo upsell.
  void emailCheckResult(repo, token, row.email, siteName, result.evaluation).catch(() => {});

  return NextResponse.json({ analyzed: true, result: dto });
}

function toDto(
  e: SiteEvaluation,
  meta: { siteName: string; address: string | null; areaAcres: number; suitability: CheckResultDTO["suitability"]; isDemo: boolean }
): CheckResultDTO {
  const obs = [e.previousObservation, e.latestObservation].filter(Boolean) as NonNullable<
    SiteEvaluation["latestObservation"]
  >[];
  return {
    status: e.status,
    score: e.stasis.score,
    confidence: e.confidence.level,
    explanation: e.explanation,
    reasons: e.reasons,
    latestObservationDate: e.latestObservation?.date ?? null,
    previousObservationDate: e.previousObservation?.date ?? null,
    usableObservationCount: e.usableObservationCount,
    recentChangePercent: e.stasis.recentChangePercent,
    baselineChangePercent: e.stasis.baselineChangePercent,
    lowChangeDurationDays: e.stasis.lowChangeDurationDays,
    areaAcres: meta.areaAcres,
    siteName: meta.siteName,
    address: meta.address,
    analyzedAtIso: e.evaluatedAt,
    isDemo: meta.isDemo,
    dataGap: e.status === "DATA_GAP",
    suitability: meta.suitability,
    observations: obs.map((o) => ({
      date: o.date,
      validPixelPercent: o.validPixelPercent,
      quality: o.qualityStatus,
      ndviMean: o.ndvi.mean,
    })),
  };
}

async function emailCheckResult(
  repo: NonNullable<ReturnType<typeof getSiteRepository>>,
  token: string,
  email: string,
  siteName: string,
  evaluation: SiteEvaluation
): Promise<void> {
  const viewUrl = `${appUrl()}/check/${encodeURIComponent(token)}`;
  const subscribeUrl = `${appUrl()}/#pricing`;
  const rendered = renderCheckResult({ siteName, evaluation, viewUrl, subscribeUrl });
  const provider = getEmailProvider();
  const res = await provider.send({
    to: email,
    from: getEmailFrom(),
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
  await repo.recordEmailEvent({
    to: email,
    type: "check_result",
    provider: provider.name,
    providerId: res.id,
    subject: rendered.subject,
    delivered: res.delivered,
  });
  await repo.markSiteCheckResultEmailed(token);
}
