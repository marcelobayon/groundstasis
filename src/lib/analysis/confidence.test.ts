import { describe, it, expect } from "vitest";
import { assessConfidence } from "./confidence";
import type { Baseline } from "./types";
import { makeObservation } from "@/test/fixtures";

const established: Baseline = { established: true, medianChangePercent: 10, stDevChangePercent: 3, sampleSize: 4 };
const notEstablished: Baseline = { established: false, medianChangePercent: 0, stDevChangePercent: 0, sampleSize: 1 };

describe("confidence", () => {
  it("is HIGH with many clean observations and an established baseline", () => {
    const obs = Array.from({ length: 6 }, (_, i) =>
      makeObservation({ id: `o${i}`, date: `2026-0${i + 1}-01`, ndvi: 0.3, ndbi: 0.1, bsi: 0.1, validPixelPercent: 96, cloudPercent: 4 })
    );
    const c = assessConfidence(obs, established);
    expect(c.level).toBe("HIGH");
    expect(c.score).toBeGreaterThanOrEqual(0.7);
  });

  it("is LOW with few, partially obscured observations and no baseline", () => {
    const obs = [
      makeObservation({ id: "a", date: "2026-01-01", ndvi: 0.3, ndbi: 0.1, bsi: 0.1, validPixelPercent: 62, cloudPercent: 38 }),
      makeObservation({ id: "b", date: "2026-01-11", ndvi: 0.3, ndbi: 0.1, bsi: 0.1, validPixelPercent: 61, cloudPercent: 39 }),
    ];
    const c = assessConfidence(obs, notEstablished);
    expect(c.level).toBe("LOW");
  });
});
