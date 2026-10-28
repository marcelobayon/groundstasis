import type { Observation, ObservationChange, BandStats } from "@/lib/analysis/types";

// Shared test fixtures. Not a *.test.ts file, so it is not executed as a suite —
// only imported by the real tests.

export function bandStats(mean: number): BandStats {
  return { mean, median: mean, stDev: 0.02, min: mean - 0.05, max: mean + 0.05, sampleCount: 1500 };
}

export function makeObservation(opts: {
  id: string;
  date: string;
  ndvi: number;
  ndbi: number;
  bsi: number;
  validPixelPercent?: number;
  cloudPercent?: number;
  quality?: "OK" | "LOW_QUALITY";
}): Observation {
  return {
    observationId: opts.id,
    date: opts.date,
    provider: "test",
    ndvi: bandStats(opts.ndvi),
    ndbi: bandStats(opts.ndbi),
    bsi: bandStats(opts.bsi),
    validPixelPercent: opts.validPixelPercent ?? 95,
    cloudPercent: opts.cloudPercent ?? 5,
    qualityStatus: opts.quality ?? "OK",
  };
}

export function makeChange(siteChangePercent: number, daysBetween = 10): ObservationChange {
  return {
    fromObservationId: "a",
    toObservationId: "b",
    fromDate: "2026-01-01",
    toDate: "2026-01-11",
    daysBetween,
    deltaNdvi: siteChangePercent / 100,
    deltaNdbi: siteChangePercent / 100,
    deltaBsi: siteChangePercent / 100,
    siteChangePercent,
    changeVelocity: daysBetween > 0 ? siteChangePercent / daysBetween : 0,
  };
}

/** A square polygon of `meters` on a side, anchored at (lon, lat). */
export function squarePolygon(lat: number, lon: number, meters: number) {
  const dLat = meters / 110574;
  const dLon = meters / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    type: "Polygon" as const,
    coordinates: [
      [
        [lon, lat],
        [lon + dLon, lat],
        [lon + dLon, lat + dLat],
        [lon, lat + dLat],
        [lon, lat],
      ] as [number, number][],
    ],
  };
}
