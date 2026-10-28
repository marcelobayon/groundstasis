import { describe, it, expect } from "vitest";
import {
  serializeSiteSummary,
  serializeSiteDetail,
  serializeObservation,
  serializeCheck,
  parseLimit,
} from "./serialize";

const D = (s: string) => new Date(s);

describe("serializers (snake_case wire contract)", () => {
  it("site summary maps camelCase → snake_case and ISO-formats dates", () => {
    const out = serializeSiteSummary({
      id: "s1",
      name: "Lot 7",
      address: null,
      status: "ACTIVE",
      stasisScore: 82,
      confidence: "HIGH",
      lastEvaluatedAt: D("2026-10-01T00:00:00.000Z"),
    });
    expect(out).toEqual({
      id: "s1",
      name: "Lot 7",
      address: null,
      status: "ACTIVE",
      stasis_score: 82,
      confidence: "HIGH",
      last_evaluated_at: "2026-10-01T00:00:00.000Z",
    });
  });

  it("site detail includes detail fields and null-safes dates", () => {
    const out = serializeSiteDetail({
      id: "s1",
      name: "Lot 7",
      address: "100 Main",
      status: "WATCH",
      stasisScore: 50,
      confidence: "MEDIUM",
      lastEvaluatedAt: null,
      latitude: 40.7,
      longitude: -111.9,
      areaAcres: 2.5,
      loanAmount: 1250000,
      loanNumber: "LN-1",
      constructionStart: D("2026-01-01T00:00:00.000Z"),
      constructionEnd: null,
      drawIntelligence: true,
      createdAt: D("2026-01-01T00:00:00.000Z"),
      updatedAt: D("2026-02-01T00:00:00.000Z"),
    });
    expect(out.loan_amount).toBe(1250000);
    expect(out.construction_end).toBeNull();
    expect(out.last_evaluated_at).toBeNull();
    expect(out.draw_intelligence).toBe(true);
    expect(out.created_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("observation nests snake_cased metrics, or null when absent", () => {
    const base = {
      id: "o1",
      observationDate: D("2026-09-09T00:00:00.000Z"),
      provider: "sentinel-2",
      providerObservationId: "S2_X",
      cloudPercent: 3.2,
      usablePixelPercent: 96.8,
      qualityStatus: "OK",
      imageryUrl: null,
      createdAt: D("2026-09-10T00:00:00.000Z"),
    };
    const withMetrics = serializeObservation({
      ...base,
      metrics: {
        meanNdvi: 0.4,
        medianNdvi: 0.41,
        meanNdbi: -0.1,
        medianNdbi: -0.09,
        meanBsi: 0.2,
        medianBsi: 0.19,
        siteChangePercent: 12.5,
        changeVelocity: 1.1,
        baselineDeviation: 0.3,
        confidence: "HIGH",
      },
    });
    expect(withMetrics.observation_date).toBe("2026-09-09T00:00:00.000Z");
    expect(withMetrics.metrics).not.toBeNull();
    expect(withMetrics.metrics?.site_change_percent).toBe(12.5);

    const withoutMetrics = serializeObservation({ ...base, metrics: null });
    expect(withoutMetrics.metrics).toBeNull();
  });

  it("check serializes nullable result fields", () => {
    const out = serializeCheck({
      id: "c1",
      paid: true,
      siteName: "Lot 7",
      address: null,
      status: null,
      stasisScore: null,
      confidence: null,
      provider: null,
      analyzedAt: null,
      createdAt: D("2026-10-20T00:00:00.000Z"),
    });
    expect(out).toEqual({
      id: "c1",
      paid: true,
      site_name: "Lot 7",
      address: null,
      status: null,
      stasis_score: null,
      confidence: null,
      provider: null,
      analyzed_at: null,
      created_at: "2026-10-20T00:00:00.000Z",
    });
  });
});

describe("parseLimit", () => {
  it("defaults when absent or non-numeric", () => {
    expect(parseLimit(null, 50, 100)).toBe(50);
    expect(parseLimit("abc", 50, 100)).toBe(50);
  });
  it("clamps into [1, max] and truncates", () => {
    expect(parseLimit("0", 50, 100)).toBe(1);
    expect(parseLimit("-5", 50, 100)).toBe(1);
    expect(parseLimit("999", 50, 100)).toBe(100);
    expect(parseLimit("25.9", 50, 100)).toBe(25);
  });
});
