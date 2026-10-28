import { describe, it, expect } from "vitest";
import {
  ndvi,
  ndbi,
  bsi,
  normalizedDifference,
  pixelIndices,
  siteMetricsFromScene,
  type Scene,
} from "./indices";

describe("spectral indices", () => {
  it("computes NDVI correctly", () => {
    expect(ndvi(0.4, 0.2)).toBeCloseTo(0.3333, 4);
  });

  it("computes NDBI and BSI", () => {
    expect(ndbi(0.3, 0.4)).toBeCloseTo((0.3 - 0.4) / (0.3 + 0.4), 6);
    expect(bsi(0.3, 0.2, 0.4, 0.1)).toBeCloseTo((0.3 + 0.2 - (0.4 + 0.1)) / (0.3 + 0.2 + 0.4 + 0.1), 6);
  });

  it("guards divide-by-zero by returning null", () => {
    expect(normalizedDifference(0, 0)).toBeNull();
    expect(ndvi(0, 0)).toBeNull();
    expect(bsi(0, 0, 0, 0)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(ndvi(NaN, 0.2)).toBeNull();
    expect(bsi(0.3, Infinity, 0.4, 0.1)).toBeNull();
  });

  it("excludes masked and undefined pixels from a pixel reading", () => {
    expect(pixelIndices({ B02: 0.1, B04: 0.2, B08: 0.4, B11: 0.3, valid: 0 })).toBeNull();
    // NIR + Red == 0 -> NDVI undefined -> whole pixel null
    expect(pixelIndices({ B02: 0.1, B04: 0, B08: 0, B11: 0.3 })).toBeNull();
  });

  it("reduces a scene to site metrics, excluding masked pixels", () => {
    const scene: Scene = {
      B02: [0.1, 0.1, 0.1, 0.1],
      B04: [0.2, 0.2, 0.2, 0.2],
      B08: [0.4, 0.4, 0.4, 0.4],
      B11: [0.3, 0.3, 0.3, 0.3],
      mask: [1, 1, 0, 1], // third pixel masked
    };
    const m = siteMetricsFromScene(scene);
    expect(m.totalPixels).toBe(4);
    expect(m.ndvi.sampleCount).toBe(3);
    expect(m.validPixelPercent).toBeCloseTo(75, 5);
    expect(m.ndvi.mean).toBeCloseTo(0.3333, 4);
  });

  it("handles an all-masked scene without throwing", () => {
    const scene: Scene = { B02: [0.1], B04: [0.2], B08: [0.4], B11: [0.3], mask: [0] };
    const m = siteMetricsFromScene(scene);
    expect(m.validPixelPercent).toBe(0);
    expect(m.ndvi.sampleCount).toBe(0);
  });
});
