import { describe, it, expect } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { SiteRepository, type AnalysisPersistInput } from "./repository";
import type { Observation, SiteEvaluation, BandStats } from "@/lib/analysis/types";
import type { Alert } from "@/lib/analysis/alerts";

function band(m: number): BandStats {
  return { mean: m, median: m, stDev: 0.02, min: m - 0.05, max: m + 0.05, sampleCount: 1000 };
}
function obs(id: string): Observation {
  return {
    observationId: id,
    date: "2026-09-24",
    provider: "demo",
    ndvi: band(0.2),
    ndbi: band(0.1),
    bsi: band(0.1),
    validPixelPercent: 95,
    cloudPercent: 5,
    qualityStatus: "OK",
  };
}
function evaluation(): SiteEvaluation {
  return {
    status: "STASIS",
    stasis: {
      score: 78,
      components: { recentLowChange: 30, historicalDeviation: 14, duration: 20, consecutive: 13, dataQualityPenalty: 2 },
      recentChangePercent: 2,
      baselineChangePercent: 8,
      consecutiveLowChange: 3,
      lowChangeDurationDays: 27,
    },
    confidence: { level: "HIGH", score: 0.9, reasons: [] },
    baseline: { established: true, medianChangePercent: 8, stDevChangePercent: 3, sampleSize: 6 },
    latestObservation: obs("obs-9"),
    previousObservation: obs("obs-8"),
    usableObservationCount: 9,
    explanation: "",
    reasons: [],
    analysisVersion: "stasis-v0.1",
    thresholdsVersion: "thresholds-v0.1",
    evaluatedAt: "2026-10-01T12:00:00.000Z",
  };
}
function alert(key: string): Alert {
  return {
    type: "STASIS_DETECTED",
    severity: "WARNING",
    siteId: "s1",
    score: 78,
    confidence: "HIGH",
    idempotencyKey: key,
    triggeredAt: "2026-10-01T12:00:00.000Z",
    observationId: "obs-9",
    analysisVersion: "stasis-v0.1",
    thresholdsVersion: "thresholds-v0.1",
  };
}

// In-memory fake that simulates the Prisma surface the repository uses,
// including the unique-constraint (P2002) on SiteAlert.idempotencyKey.
function makeFake() {
  const sentKeys = new Set<string>();
  const runs: unknown[] = [];
  const upserts: unknown[] = [];
  const fake = {
    site: {
      findMany: async () => [
        { id: "s1", name: "S", loanNumber: null, geometryGeojson: {}, constructionStart: null, user: { email: "a@b.com" } },
      ],
      findUnique: async () => ({ status: "REVIEW", user: { email: "a@b.com" } }),
      update: async () => ({}),
    },
    siteAlert: {
      findMany: async () => Array.from(sentKeys).map((k) => ({ idempotencyKey: k })),
      create: async ({ data }: { data: { idempotencyKey: string } }) => {
        if (sentKeys.has(data.idempotencyKey)) {
          const e = new Error("Unique constraint failed") as Error & { code: string };
          e.code = "P2002";
          throw e;
        }
        sentKeys.add(data.idempotencyKey);
        return {};
      },
    },
    siteObservation: {
      upsert: async (a: unknown) => {
        upserts.push(a);
        return {};
      },
      findFirst: async () => ({ providerObservationId: "obs-9" }),
    },
    analysisRun: {
      create: async (a: unknown) => {
        runs.push(a);
        return {};
      },
    },
    emailEvent: { create: async () => ({}) },
  };
  return { repo: new SiteRepository(fake as unknown as PrismaClient), sentKeys, runs, upserts };
}

const input = (keys: string[]): AnalysisPersistInput => ({
  observations: [obs("obs-8"), obs("obs-9")],
  evaluation: evaluation(),
  alerts: keys.map(alert),
  run: {
    analysisVersion: "stasis-v0.1",
    thresholdsVersion: "thresholds-v0.1",
    provider: "demo",
    status: "COMPLETE",
    observationIds: ["obs-8", "obs-9"],
  },
});

describe("SiteRepository", () => {
  it("persists observations, updates the site, inserts alerts, records a run", async () => {
    const { repo, runs, upserts } = makeFake();
    const r = await repo.persistAnalysis("s1", input(["s1:STASIS_DETECTED:obs-9"]));
    expect(r.alertsInserted).toBe(1);
    expect(upserts).toHaveLength(2);
    expect(runs).toHaveLength(1);
  });

  it("is idempotent: a repeated alert key is skipped, not thrown", async () => {
    const { repo } = makeFake();
    const first = await repo.persistAnalysis("s1", input(["s1:STASIS_DETECTED:obs-9"]));
    const second = await repo.persistAnalysis("s1", input(["s1:STASIS_DETECTED:obs-9"]));
    expect(first.alertsInserted).toBe(1);
    expect(second.alertsInserted).toBe(0);
  });

  it("reports prior state via getSiteContext", async () => {
    const { repo } = makeFake();
    await repo.persistAnalysis("s1", input(["s1:STASIS_DETECTED:obs-9"]));
    const ctx = await repo.getSiteContext("s1");
    expect(ctx.previousStatus).toBe("REVIEW");
    expect(ctx.alreadySentKeys).toContain("s1:STASIS_DETECTED:obs-9");
    expect(ctx.latestKnownObservationId).toBe("obs-9");
    expect(ctx.recipientEmail).toBe("a@b.com");
  });
});
