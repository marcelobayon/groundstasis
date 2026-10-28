import { describe, it, expect } from "vitest";
import { computeBaseline } from "./baseline";
import { makeChange } from "@/test/fixtures";

describe("baseline", () => {
  it("excludes the most recent window and takes the median of the rest", () => {
    // 5 intervals; default recentWindow=2 -> historical = first 3 = [18,13,11]
    const changes = [18, 13, 11, 10, 2].map((p) => makeChange(p));
    const b = computeBaseline(changes);
    expect(b.sampleSize).toBe(3);
    expect(b.medianChangePercent).toBeCloseTo(13, 6);
    expect(b.established).toBe(true);
  });

  it("is not established with too few historical intervals", () => {
    const changes = [10, 9].map((p) => makeChange(p)); // historical = 0 after excluding 2
    const b = computeBaseline(changes);
    expect(b.sampleSize).toBe(0);
    expect(b.established).toBe(false);
  });
});
