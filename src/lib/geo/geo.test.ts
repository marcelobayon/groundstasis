import { describe, it, expect } from "vitest";
import { polygonAreaSqMeters, polygonAreaAcres } from "./area";
import { validatePolygon } from "./validate";
import { assessSuitability } from "./suitability";
import { squarePolygon } from "@/test/fixtures";
import { DEMO_SITE } from "@/data/demo-site";

describe("polygon area", () => {
  it("computes ~1,000,000 m^2 for a 1 km square", () => {
    const poly = squarePolygon(40, -111.9, 1000);
    const m2 = polygonAreaSqMeters(poly);
    expect(m2).toBeGreaterThan(960_000);
    expect(m2).toBeLessThan(1_040_000);
  });

  it("converts to acres", () => {
    const poly = squarePolygon(40, -111.9, 1000);
    expect(polygonAreaAcres(poly)).toBeGreaterThan(235);
    expect(polygonAreaAcres(poly)).toBeLessThan(260);
  });

  it("returns 0 for an empty polygon", () => {
    expect(polygonAreaSqMeters({ type: "Polygon", coordinates: [] })).toBe(0);
  });
});

describe("polygon validation", () => {
  it("accepts a valid closed polygon", () => {
    expect(validatePolygon(DEMO_SITE.geometry).valid).toBe(true);
  });

  it("rejects an unclosed ring", () => {
    const r = validatePolygon({
      type: "Polygon",
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0]]],
    });
    expect(r.valid).toBe(false);
  });

  it("rejects non-polygons and out-of-range coordinates", () => {
    expect(validatePolygon({ type: "Point", coordinates: [0, 0] }).valid).toBe(false);
    expect(
      validatePolygon({ type: "Polygon", coordinates: [[[200, 0], [0, 1], [1, 1], [200, 0]]] }).valid
    ).toBe(false);
  });
});

describe("satellite suitability", () => {
  it("rates a large site GOOD", () => {
    expect(assessSuitability(squarePolygon(40, -111.9, 200)).suitability).toBe("GOOD");
    expect(assessSuitability(DEMO_SITE.geometry).suitability).toBe("GOOD");
  });

  it("rates a small site LIMITED", () => {
    expect(assessSuitability(squarePolygon(40, -111.9, 60)).suitability).toBe("LIMITED");
  });

  it("rates a tiny site INSUFFICIENT", () => {
    expect(assessSuitability(squarePolygon(40, -111.9, 20)).suitability).toBe("INSUFFICIENT");
  });
});
