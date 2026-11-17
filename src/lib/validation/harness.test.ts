import { describe, it, expect } from "vitest";
import { runValidation, type Evaluator } from "./harness";
import type { SiteLabel } from "./labels";
import type { SiteEvaluation } from "@/lib/analysis/types";

// Minimal fake evaluation — we only read status/confidence/usableObservationCount.
function fakeEval(
  status: SiteEvaluation["status"],
  level: "HIGH" | "MEDIUM" | "LOW",
  usable = 12,
): SiteEvaluation {
  return { status, confidence: { level }, usableObservationCount: usable } as unknown as SiteEvaluation;
}

const labels: SiteLabel[] = [
  { siteId: "a", periodStart: "2026-01-01", periodEnd: "2026-06-01", groundTruth: "STALLED", source: "permit A" },
  { siteId: "b", periodStart: "2026-01-01", periodEnd: "2026-06-01", groundTruth: "ACTIVE", source: "permit B" },
  { siteId: "c", periodStart: "2026-01-01", periodEnd: "2026-06-01", groundTruth: "STALLED", source: "permit C" },
];

// Engine says: a→STASIS (correct stall), b→ACTIVE (correct active), c→DATA_GAP (abstain).
const scripted: Record<string, SiteEvaluation> = {
  a: fakeEval("STASIS", "HIGH"),
  b: fakeEval("ACTIVE", "MEDIUM"),
  c: fakeEval("DATA_GAP", "LOW", 1),
};

describe("runValidation", () => {
  it("evaluates each labeled site against stored observations and scores it", async () => {
    const evaluate: Evaluator = (_obs, _now) => _obs[0] as unknown as SiteEvaluation; // unused path
    const loadObservations = async (label: SiteLabel) => [scripted[label.siteId]] as never;

    const run = await runValidation(labels, loadObservations, (obs) => (obs[0] as unknown as SiteEvaluation));
    void evaluate;

    expect(run.report.confusion).toEqual({ tp: 1, fp: 0, tn: 1, fn: 0 });
    expect(run.report.insufficientRate).toBeCloseTo(1 / 3);
    expect(run.report.coverage).toBeCloseTo(2 / 3);

    const c = run.perSite.find((p) => p.siteId === "c")!;
    expect(c.predicted).toBe("INSUFFICIENT");
    expect(c.correct).toBeNull(); // abstention is not scored as wrong

    const a = run.perSite.find((p) => p.siteId === "a")!;
    expect(a.predicted).toBe("STALLED");
    expect(a.correct).toBe(true);
    expect(a.source).toBe("permit A");
  });

  it("passes periodEnd as the evaluation 'now'", async () => {
    let seenNow: Date | null = null;
    const evaluate: Evaluator = (_obs, now) => {
      seenNow = now;
      return fakeEval("ACTIVE", "HIGH");
    };
    await runValidation([labels[0]], async () => [], evaluate);
    expect(seenNow).not.toBeNull();
    expect((seenNow as unknown as Date).toISOString()).toBe(new Date("2026-06-01").toISOString());
  });
});
