import { describe, it, expect } from "vitest";
import { delayCost, monitoringGap, daysBetweenDates, escalationCost } from "./calc";

describe("delayCost", () => {
  it("computes interest + carry over a delay", () => {
    const r = delayCost({ loanBalance: 1_000_000, annualRatePct: 11, monthlyCarry: 2000, delayMonths: 3 });
    expect(r.monthlyInterest).toBeCloseTo(9166.67, 1);
    expect(r.interestOverDelay).toBeCloseTo(27_500, 0);
    expect(r.carryOverDelay).toBe(6000);
    expect(r.totalDelayCost).toBeCloseTo(33_500, 0);
  });

  it("is zero for a zero delay and never negative", () => {
    expect(delayCost({ loanBalance: 500_000, annualRatePct: 10, delayMonths: 0 }).totalDelayCost).toBe(0);
    expect(delayCost({ loanBalance: -5, annualRatePct: -5, delayMonths: -5 }).totalDelayCost).toBe(0);
  });
});

describe("monitoringGap", () => {
  it("flags HIGH when days since inspection far exceed cadence", () => {
    const r = monitoringGap({ lastInspectionISO: "2026-09-01", cadenceDays: 14, todayISO: "2026-10-01" });
    expect(r.daysSinceInspection).toBe(30);
    expect(r.gapDays).toBe(16);
    expect(r.band).toBe("HIGH");
  });

  it("is LOW when within cadence", () => {
    const r = monitoringGap({ lastInspectionISO: "2026-09-28", cadenceDays: 14, todayISO: "2026-10-01" });
    expect(r.gapDays).toBe(0);
    expect(r.band).toBe("LOW");
  });

  it("is MODERATE just past cadence", () => {
    const r = monitoringGap({ lastInspectionISO: "2026-09-10", cadenceDays: 14, todayISO: "2026-10-01" });
    // 21 days since, cadence 14 -> gap 7 (<= cadence) -> MODERATE
    expect(r.gapDays).toBe(7);
    expect(r.band).toBe("MODERATE");
  });

  it("never returns a negative gap", () => {
    const r = monitoringGap({ lastInspectionISO: "2026-10-01", cadenceDays: 30, todayISO: "2026-10-01" });
    expect(r.gapDays).toBe(0);
    expect(daysBetweenDates("2026-10-05", "2026-10-01")).toBe(0);
  });
});

describe("escalationCost", () => {
  it("compounds annually", () => {
    const r = escalationCost({ baseCost: 1_000_000, annualRatePct: 6, periodValue: 2, periodUnit: "years", mode: "compound" });
    expect(r.projectedCost).toBeCloseTo(1_123_600, 0); // 1.06^2 = 1.1236
    expect(r.dollarIncrease).toBeCloseTo(123_600, 0);
    expect(r.pctIncrease).toBeCloseTo(12.36, 2);
    expect(r.years).toBe(2);
  });

  it("supports a simple (non-compounded) model", () => {
    const r = escalationCost({ baseCost: 1_000_000, annualRatePct: 6, periodValue: 2, periodUnit: "years", mode: "simple" });
    expect(r.projectedCost).toBeCloseTo(1_120_000, 0); // 1 + 0.06*2
  });

  it("handles months and fractional periods", () => {
    const r = escalationCost({ baseCost: 1_000_000, annualRatePct: 5, periodValue: 18, periodUnit: "months", mode: "compound" });
    expect(r.years).toBeCloseTo(1.5, 5);
    expect(r.projectedCost).toBeCloseTo(1_000_000 * Math.pow(1.05, 1.5), 0);
  });

  it("returns base cost at zero rate or zero time; zero base gives zero pct", () => {
    expect(escalationCost({ baseCost: 500_000, annualRatePct: 0, periodValue: 3, periodUnit: "years", mode: "compound" }).projectedCost).toBe(500_000);
    expect(escalationCost({ baseCost: 500_000, annualRatePct: 7, periodValue: 0, periodUnit: "years", mode: "compound" }).projectedCost).toBe(500_000);
    expect(escalationCost({ baseCost: 0, annualRatePct: 7, periodValue: 3, periodUnit: "years", mode: "compound" }).pctIncrease).toBe(0);
  });

  it("never returns a negative or non-finite projection", () => {
    const r = escalationCost({ baseCost: -5, annualRatePct: -5, periodValue: -5, periodUnit: "years", mode: "compound" });
    expect(r.projectedCost).toBe(0);
    expect(Number.isFinite(r.projectedCost)).toBe(true);
  });
});
