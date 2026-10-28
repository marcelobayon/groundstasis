import type { Observation, BandStats } from "@/lib/analysis/types";
import type { GeoJSONPolygon } from "@/lib/geo/types";

// =============================================================================
// DEMO DATA — NOT REAL SATELLITE ANALYSIS
// -----------------------------------------------------------------------------
// This is a synthetic, hand-crafted timeline for a fictional construction site.
// It exists so visitors can understand the product without Stripe or live
// satellite processing. Every surface that renders it MUST label it DEMO DATA.
// The numbers are designed to produce a realistic ACTIVE -> ... -> STASIS story
// when run through the real analysis engine (the engine is NOT faked).
// =============================================================================

export interface DemoSite {
  id: string;
  name: string;
  address: string;
  loanAmount: number;
  loanNumber: string;
  constructionStart: string;
  expectedCompletion: string;
  geometry: GeoJSONPolygon;
  /** fixed "now" so the demo reads as a current stasis case */
  asOf: string;
  observations: Observation[];
}

function bstats(meanVal: number, sample = 2100): BandStats {
  const v = Math.round(meanVal * 1000) / 1000;
  return {
    mean: v,
    median: v,
    stDev: 0.03,
    min: Math.round((v - 0.06) * 1000) / 1000,
    max: Math.round((v + 0.06) * 1000) / 1000,
    sampleCount: sample,
  };
}

function makeObs(
  id: string,
  date: string,
  idx: { ndvi: number; ndbi: number; bsi: number },
  quality: { cloudPercent: number; validPixelPercent: number; usable: boolean }
): Observation {
  return {
    observationId: id,
    date,
    provider: "demo",
    ndvi: bstats(idx.ndvi),
    ndbi: bstats(idx.ndbi),
    bsi: bstats(idx.bsi),
    validPixelPercent: quality.validPixelPercent,
    cloudPercent: quality.cloudPercent,
    qualityStatus: quality.usable ? "OK" : "LOW_QUALITY",
    isDemo: true,
  };
}

// A ~180 m square industrial lot in West Valley City, UT (~8 acres).
const GEOMETRY: GeoJSONPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-111.9234, 40.7585],
      [-111.9234, 40.76013],
      [-111.92127, 40.76013],
      [-111.92127, 40.7585],
      [-111.9234, 40.7585],
    ],
  ],
};

// Surface starts vegetated, then clears / grades / builds (NDVI falls, NDBI and
// BSI rise), then goes quiet. Each step's magnitude = the intended
// siteChangePercent for that interval.
const START = { ndvi: 0.6, ndbi: -0.2, bsi: -0.25 };
// A gradual decline: active -> moderating -> quiet. Produces the full
// ACTIVE -> WATCH -> REVIEW -> STASIS escalation ladder through the real engine.
const STEP_CHANGE_PERCENT = [18, 12, 9, 7, 5, 2.3, 1.9, 2.1];
const DATES = [
  "2026-07-21",
  "2026-07-28",
  "2026-08-04",
  "2026-08-11",
  "2026-08-18",
  "2026-08-28",
  "2026-09-07",
  "2026-09-17",
  "2026-09-24",
];

function buildObservations(): Observation[] {
  const obs: Observation[] = [];
  let cur = { ...START };
  obs.push(makeObs("obs-1", DATES[0], cur, { cloudPercent: 5, validPixelPercent: 96, usable: true }));
  STEP_CHANGE_PERCENT.forEach((pct, i) => {
    const d = pct / 100; // per-index absolute delta so the 3-index mean == pct%
    cur = { ndvi: cur.ndvi - d, ndbi: cur.ndbi + d, bsi: cur.bsi + d };
    // keep observations clean/usable, with light natural variation in quality
    const cloud = [8, 6, 12, 9, 7, 11, 5, 10][i];
    const valid = [94, 95, 88, 92, 95, 86, 97, 91][i];
    obs.push(
      makeObs(`obs-${i + 2}`, DATES[i + 1], cur, {
        cloudPercent: cloud,
        validPixelPercent: valid,
        usable: true,
      })
    );
  });

  // An excluded, cloud-contaminated scene — demonstrates the quality filter and
  // the difference between "no usable data" and "no activity".
  obs.push(
    makeObs("obs-cloudy", "2026-09-02", { ndvi: 0.1, ndbi: 0.3, bsi: 0.28 }, {
      cloudPercent: 88,
      validPixelPercent: 18,
      usable: false,
    })
  );

  return obs;
}

export const DEMO_SITE: DemoSite = {
  id: "demo-ridgeline",
  name: "Ridgeline Logistics Center",
  address: "West Valley City, UT",
  loanAmount: 4_200_000,
  loanNumber: "CL-2026-0417",
  constructionStart: "2026-05-15",
  expectedCompletion: "2026-12-20",
  geometry: GEOMETRY,
  asOf: "2026-10-01T12:00:00.000Z",
  observations: buildObservations(),
};
