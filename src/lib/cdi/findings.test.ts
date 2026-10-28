import { describe, it, expect } from "vitest";
import { compareMilestoneToEvidence, type MilestoneContext, type MilestoneStage } from "./findings";
import type { SiteEvaluation, SiteStatus, ConfidenceLevel } from "@/lib/analysis/types";

function mkEval(
  status: SiteStatus,
  opts: { usable?: number; conf?: ConfidenceLevel; latestDate?: string } = {}
): SiteEvaluation {
  const usable = opts.usable ?? 20;
  return {
    status,
    stasis: {
      score: status === "STASIS" ? 90 : status === "ACTIVE" ? 0 : 40,
      components: { recentLowChange: 0, historicalDeviation: 0, duration: 0, consecutive: 0, dataQualityPenalty: 0 },
      recentChangePercent: 2,
      baselineChangePercent: 2,
      consecutiveLowChange: 0,
      lowChangeDurationDays: 0,
    },
    confidence: { level: opts.conf ?? "HIGH", score: 0.8, reasons: [] },
    baseline: { established: true, medianChangePercent: 2, stDevChangePercent: 1, sampleSize: usable },
    latestObservation: opts.latestDate
      ? ({ observationId: "o1", date: opts.latestDate, provider: "test", validPixelPercent: 90, cloudPercent: 5, qualityStatus: "OK", ndvi: { mean: 0.3, median: 0.3, stDev: 0, min: 0, max: 0, sampleCount: usable }, ndbi: { mean: 0, median: 0, stDev: 0, min: 0, max: 0, sampleCount: usable }, bsi: { mean: 0, median: 0, stDev: 0, min: 0, max: 0, sampleCount: usable } })
      : undefined,
    usableObservationCount: usable,
    explanation: "",
    reasons: [],
    analysisVersion: "t",
    thresholdsVersion: "t",
    evaluatedAt: "2026-10-01",
  };
}

const ctx = (stage: MilestoneStage, extra: Partial<MilestoneContext> = {}): MilestoneContext => ({
  reportedStage: stage,
  ...extra,
});

describe("compareMilestoneToEvidence", () => {
  it("INSUFFICIENT_DATA on a data gap, with null confidence", () => {
    const f = compareMilestoneToEvidence(ctx("FOUNDATION"), mkEval("DATA_GAP"));
    expect(f.code).toBe("INSUFFICIENT_DATA");
    expect(f.confidence).toBeNull();
  });

  it("INSUFFICIENT_DATA when fewer than 3 usable observations", () => {
    const f = compareMilestoneToEvidence(ctx("FOUNDATION"), mkEval("ACTIVE", { usable: 2 }));
    expect(f.code).toBe("INSUFFICIENT_DATA");
  });

  it("NOT_VERIFIABLE for an interior/unknown stage even when ACTIVE", () => {
    expect(compareMilestoneToEvidence(ctx("EXTERIOR_COMPLETION"), mkEval("ACTIVE")).code).toBe("NOT_VERIFIABLE");
    expect(compareMilestoneToEvidence(ctx("UNKNOWN"), mkEval("STASIS")).code).toBe("NOT_VERIFIABLE");
  });

  it("ACTIVITY_CONSISTENT for an observable stage that is ACTIVE", () => {
    const f = compareMilestoneToEvidence(ctx("STRUCTURAL_FRAMING"), mkEval("ACTIVE", { conf: "HIGH" }));
    expect(f.code).toBe("ACTIVITY_CONSISTENT");
    expect(f.confidence).toBe("HIGH");
  });

  it("REDUCED_ACTIVITY for an observable stage that is WATCH or REVIEW", () => {
    expect(compareMilestoneToEvidence(ctx("FOUNDATION"), mkEval("WATCH")).code).toBe("REDUCED_ACTIVITY");
    expect(compareMilestoneToEvidence(ctx("EXCAVATION"), mkEval("REVIEW")).code).toBe("REDUCED_ACTIVITY");
  });

  it("POTENTIAL_DISCREPANCY when STASIS and the reported target date has passed", () => {
    const f = compareMilestoneToEvidence(
      ctx("STRUCTURAL_FRAMING", { targetDate: new Date("2026-01-01") }),
      mkEval("STASIS"),
      { now: new Date("2026-06-01") }
    );
    expect(f.code).toBe("POTENTIAL_DISCREPANCY");
  });

  it("REDUCED_ACTIVITY when STASIS but no/future target date (no explicit schedule conflict)", () => {
    const future = compareMilestoneToEvidence(
      ctx("FOUNDATION", { targetDate: new Date("2027-01-01") }),
      mkEval("STASIS"),
      { now: new Date("2026-06-01") }
    );
    expect(future.code).toBe("REDUCED_ACTIVITY");
    const none = compareMilestoneToEvidence(ctx("FOUNDATION"), mkEval("STASIS"));
    expect(none.code).toBe("REDUCED_ACTIVITY");
  });

  it("ACTIVITY_RESUMED only when resumed signal + ACTIVE + observable stage", () => {
    const f = compareMilestoneToEvidence(ctx("FOUNDATION"), mkEval("ACTIVE"), { recentlyResumed: true });
    expect(f.code).toBe("ACTIVITY_RESUMED");
  });

  it("keeps reported and observed context distinct", () => {
    const f = compareMilestoneToEvidence(
      ctx("FOUNDATION", { targetDate: new Date("2026-03-01"), actualStageReported: "pouring footings" }),
      mkEval("ACTIVE", { latestDate: "2026-09-18" })
    );
    expect(f.reported.stage).toBe("FOUNDATION");
    expect(f.reported.actualStageReported).toBe("pouring footings");
    expect(f.observed.status).toBe("ACTIVE");
    expect(f.observed.latestObservationDate).toBe("2026-09-18");
  });
});
