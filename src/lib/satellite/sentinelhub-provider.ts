import type { Observation, QualityStatus, BandStats } from "@/lib/analysis/types";
import type { SatelliteProvider } from "./provider";
import type { ProviderSite, DateRange, ObservationMetadata, PreviewImage } from "./types";
import type { GeoJSONPolygon } from "@/lib/geo/types";

// =============================================================================
// Copernicus Data Space Ecosystem (CDSE) — Sentinel Hub Statistical API provider
// -----------------------------------------------------------------------------
// VALIDATED against a live CDSE response on 2026-10-07 (scripts/validate-cdse.mjs).
// Confirmed facts baked into this parser:
//   • The response has a single output, `indices`, with bands B0 (NDVI),
//     B1 (NDBI), B2 (BSI). There is NO separate `dataMask` output block.
//   • Each band's `stats` includes: mean, stDev, min, max, sampleCount,
//     noDataCount, and percentiles["50.0"] (median).
//   • Valid-pixel fraction = (sampleCount - noDataCount) / sampleCount.
//   • resx/resy are in the BOUNDS-CRS UNITS. Our bounds are CRS84 (degrees), so
//     a target ground resolution in metres MUST be converted to degrees, or the
//     whole AOI collapses to a single pixel (sampleCount=1).
//
// FAIL-SAFE PRINCIPLE: if coverage can't be derived, or the AOI produced too
// few pixels, the observation is marked LOW_QUALITY (never a fake "100% clear").
// A parser surprise can only ever UNDER-report usability, never over-report it.
// =============================================================================

const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B04", "B08", "B11", "SCL", "dataMask"] }],
    output: [
      { id: "indices", bands: 3, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  let ndvi = index(s.B08, s.B04);              // (B08 - B04)/(B08 + B04)
  let ndbi = index(s.B11, s.B08);              // (B11 - B08)/(B11 + B08)
  let den = (s.B11 + s.B04) + (s.B08 + s.B02);
  let bsi = den === 0 ? 0 : ((s.B11 + s.B04) - (s.B08 + s.B02)) / den;
  // Exclude SCL: 3 shadow, 8 cloud(med), 9 cloud(high), 10 cirrus, 11 snow.
  var bad = (s.SCL == 3 || s.SCL == 8 || s.SCL == 9 || s.SCL == 10 || s.SCL == 11);
  var valid = (s.dataMask == 1 && !bad) ? 1 : 0;
  // The dataMask output drives noDataCount on the indices output server-side.
  return { indices: [ndvi, ndbi, bsi], dataMask: [valid] };
}`;

/** Minimum pixels in the AOI for the stats to be meaningful (tiny sites). */
const MIN_PIXELS = 20;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export interface SentinelHubConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  tokenUrl: string;
  /** usable-pixel % below which the engine excludes an observation (applied in the engine) */
  minUsablePixelPercent: number;
  /** aggregation interval, e.g. "P12D" */
  aggregationInterval: string;
  /** target ground resolution in metres (default 10) */
  resolutionMeters?: number;
}

/**
 * Statistical API resolution is in the units of the bounds CRS. Our bounds are
 * CRS84 (degrees), so convert the target metres to degrees at the AOI latitude.
 * Longitude degrees shrink with latitude (cos), latitude degrees are ~constant.
 */
function resolutionDegrees(geometry: GeoJSONPolygon, meters: number): { resx: number; resy: number } {
  const ring = geometry.coordinates[0] ?? [];
  const lat = ring.length ? ring.reduce((acc, p) => acc + p[1], 0) / ring.length : 0;
  return {
    resx: meters / (111320 * Math.cos((lat * Math.PI) / 180)),
    resy: meters / 111320,
  };
}

export class SentinelHubProvider implements SatelliteProvider {
  readonly name = "sentinelhub-cdse";
  readonly isDemo = false;
  private token: CachedToken | null = null;

  constructor(private readonly config: SentinelHubConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret);
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.token.expiresAt > now + 60_000) return this.token.accessToken;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`CDSE auth failed: ${res.status} ${await safeText(res)}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { accessToken: json.access_token, expiresAt: now + (json.expires_in ?? 600) * 1000 };
    return this.token.accessToken;
  }

  async getAvailableObservations(site: ProviderSite, range: DateRange): Promise<Observation[]> {
    if (!this.isConfigured()) {
      throw new Error("SentinelHubProvider is not configured (missing client id/secret).");
    }
    const accessToken = await this.getAccessToken();
    const meters = this.config.resolutionMeters ?? 10;

    const requestBody = {
      input: {
        bounds: {
          geometry: site.geometry,
          properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
        },
        data: [{ type: "sentinel-2-l2a", dataFilter: { mosaickingOrder: "leastCC" } }],
      },
      aggregation: {
        timeRange: { from: toZ(range.from), to: toZ(range.to) },
        aggregationInterval: { of: this.config.aggregationInterval },
        evalscript: EVALSCRIPT,
        // Converted to degrees — passing metres here collapses the AOI to 1 pixel.
        ...resolutionDegrees(site.geometry, meters),
      },
      calculations: { indices: { statistics: { default: { percentiles: { k: [50] } } } } },
    };

    const res = await fetch(`${this.config.baseUrl}/api/v1/statistics`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    if (!res.ok) throw new Error(`CDSE statistics failed: ${res.status} ${await safeText(res)}`);
    const json = (await res.json()) as StatisticalResponse;
    return parseStatisticalResponse(json);
  }

  async getObservationMetadata(observationId: string): Promise<ObservationMetadata | null> {
    return { observationId, date: observationId, provider: this.name };
  }

  async getPreview(): Promise<PreviewImage | null> {
    // A true-colour preview can be produced via the Process API on demand.
    return null;
  }
}

// --- response parsing (validated 2026-10-07) --------------------------------

interface BandStatsRaw {
  mean?: number;
  stDev?: number;
  min?: number;
  max?: number;
  sampleCount?: number;
  noDataCount?: number;
  percentiles?: Record<string, number>;
}
interface IntervalRaw {
  interval?: { from?: string; to?: string };
  outputs?: { indices?: { bands?: Record<string, { stats?: BandStatsRaw }> } };
}
interface StatisticalResponse {
  data?: IntervalRaw[];
}

function toStats(s: BandStatsRaw, sampleCount: number): BandStats {
  const mean = s.mean ?? 0;
  return {
    mean,
    median: s.percentiles?.["50.0"] ?? s.percentiles?.["50"] ?? mean,
    stDev: s.stDev ?? 0,
    min: s.min ?? 0,
    max: s.max ?? 0,
    sampleCount,
  };
}

function parseStatisticalResponse(json: StatisticalResponse): Observation[] {
  const out: Observation[] = [];
  for (const item of json.data ?? []) {
    const bands = item.outputs?.indices?.bands;
    const b0 = bands?.B0?.stats;
    const b1 = bands?.B1?.stats;
    const b2 = bands?.B2?.stats;
    if (!b0 || !b1 || !b2) continue;

    const date = (item.interval?.from ?? "").slice(0, 10);

    // Coverage from the index band's own counts (no separate dataMask output).
    const total = typeof b0.sampleCount === "number" ? b0.sampleCount : NaN;
    const noData = typeof b0.noDataCount === "number" ? b0.noDataCount : NaN;
    const canDerive = Number.isFinite(total) && total > 0 && Number.isFinite(noData);
    const validCount = canDerive ? Math.max(0, total - noData) : 0;
    const validPixelPercent = canDerive ? clampPct((validCount / total) * 100) : 0;
    const cloudPercent = clampPct(100 - validPixelPercent);

    // FAIL-SAFE: undeterminable coverage or too-few pixels -> LOW_QUALITY.
    const qualityStatus: QualityStatus = canDerive && total >= MIN_PIXELS ? "OK" : "LOW_QUALITY";

    out.push({
      observationId: date || (item.interval?.from ?? ""),
      date,
      provider: "sentinelhub-cdse",
      ndvi: toStats(b0, validCount),
      ndbi: toStats(b1, validCount),
      bsi: toStats(b2, validCount),
      validPixelPercent,
      cloudPercent,
      qualityStatus,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

function toZ(iso: string): string {
  return iso.length <= 10 ? `${iso}T00:00:00Z` : iso;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "<no body>";
  }
}
