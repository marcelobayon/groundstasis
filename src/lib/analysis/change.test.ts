import { describe, it, expect } from "vitest";
import { siteChangePercent, changeBetween, changeSeries, daysBetween } from "./change";
import { makeObservation } from "@/test/fixtures";

describe("temporal change", () => {
  it("averages absolute index deltas into a percent", () => {
    expect(siteChangePercent(0.1, 0.1, 0.1)).toBeCloseTo(10, 6);
    expect(siteChangePercent(-0.1, 0.1, -0.1)).toBeCloseTo(10, 6); // direction-agnostic
    expect(siteChangePercent(0, 0, 0)).toBe(0);
  });

  it("computes days between ISO dates", () => {
    expect(daysBetween("2026-01-01", "2026-01-11")).toBeCloseTo(10, 6);
    expect(daysBetween("2026-01-11", "2026-01-01")).toBe(0); // never negative
  });

  it("computes change between two observations", () => {
    const a = makeObservation({ id: "a", date: "2026-01-01", ndvi: 0.5, ndbi: 0.0, bsi: 0.0 });
    const b = makeObservation({ id: "b", date: "2026-01-11", ndvi: 0.4, ndbi: 0.1, bsi: 0.1 });
    const c = changeBetween(a, b);
    expect(c.deltaNdvi).toBeCloseTo(-0.1, 6);
    expect(c.siteChangePercent).toBeCloseTo(10, 5);
    expect(c.daysBetween).toBeCloseTo(10, 5);
    expect(c.changeVelocity).toBeCloseTo(1, 5);
  });

  it("builds an ordered change series of length n-1", () => {
    const obs = [
      makeObservation({ id: "1", date: "2026-01-01", ndvi: 0.5, ndbi: 0, bsi: 0 }),
      makeObservation({ id: "2", date: "2026-01-11", ndvi: 0.4, ndbi: 0.1, bsi: 0.1 }),
      makeObservation({ id: "3", date: "2026-01-21", ndvi: 0.35, ndbi: 0.15, bsi: 0.12 }),
    ];
    const series = changeSeries(obs);
    expect(series).toHaveLength(2);
    expect(series[0].toObservationId).toBe("2");
    expect(series[1].toObservationId).toBe("3");
  });
});
