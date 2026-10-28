import { describe, it, expect } from "vitest";
import { insertAlertsIdempotently, isUniqueViolation } from "./idempotency";
import type { Alert } from "@/lib/analysis/alerts";

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

describe("insertAlertsIdempotently", () => {
  it("inserts new alerts and skips duplicates (P2002)", async () => {
    const seen = new Set<string>();
    const createFn = async (a: Alert) => {
      if (seen.has(a.idempotencyKey)) {
        const e = new Error("Unique constraint failed") as Error & { code: string };
        e.code = "P2002";
        throw e;
      }
      seen.add(a.idempotencyKey);
    };
    const first = await insertAlertsIdempotently([alert("k1"), alert("k2")], createFn);
    expect(first).toEqual({ inserted: 2, skipped: 0 });

    // a re-run that re-presents k1 (already sent) plus a new k3
    const second = await insertAlertsIdempotently([alert("k1"), alert("k3")], createFn);
    expect(second).toEqual({ inserted: 1, skipped: 1 });
  });

  it("rethrows errors that are not unique-constraint violations", async () => {
    const createFn = async () => {
      throw new Error("database unreachable");
    };
    await expect(insertAlertsIdempotently([alert("k1")], createFn)).rejects.toThrow("database unreachable");
  });

  it("classifies P2002 as a unique violation and nothing else", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
