import { describe, it, expect } from "vitest";
import { computeStasis } from "./stasis";
import { computeBaseline } from "./baseline";
import { makeChange } from "@/test/fixtures";

describe("stasis score", () => {
  it("is high when recent change collapses below an established baseline", () => {
    const changes = [18, 13, 11, 10, 2, 2, 2].map((p) => makeChange(p, 10));
    const baseline = computeBaseline(changes);
    const r = computeStasis(changes, baseline, 1);
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.consecutiveLowChange).toBeGreaterThanOrEqual(3);
    expect(r.recentChangePercent).toBeLessThan(r.baselineChangePercent);
  });

  it("is low for a consistently active site", () => {
    const changes = [12, 11, 13, 10, 12, 11].map((p) => makeChange(p, 10));
    const baseline = computeBaseline(changes);
    const r = computeStasis(changes, baseline, 1);
    expect(r.score).toBeLessThan(25);
  });

  it("is penalised by poor data quality", () => {
    const changes = [18, 13, 11, 10, 2, 2, 2].map((p) => makeChange(p, 10));
    const baseline = computeBaseline(changes);
    const clean = computeStasis(changes, baseline, 1).score;
    const dirty = computeStasis(changes, baseline, 0).score;
    expect(dirty).toBeLessThan(clean);
  });

  it("never exceeds 0..100", () => {
    const changes = [50, 50, 50, 0, 0, 0, 0].map((p) => makeChange(p, 30));
    const baseline = computeBaseline(changes);
    const r = computeStasis(changes, baseline, 1);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
