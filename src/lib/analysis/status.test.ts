import { describe, it, expect } from "vitest";
import { scoreToStatus, isUsable, evaluateSite } from "./status";
import { makeObservation } from "@/test/fixtures";

describe("status mapping", () => {
  it("maps scores to the configured bands", () => {
    expect(scoreToStatus(10)).toBe("ACTIVE");
    expect(scoreToStatus(30)).toBe("WATCH");
    expect(scoreToStatus(60)).toBe("REVIEW");
    expect(scoreToStatus(80)).toBe("STASIS");
  });

  it("filters unusable observations", () => {
    expect(isUsable(makeObservation({ id: "a", date: "2026-01-01", ndvi: 0.3, ndbi: 0.1, bsi: 0.1 }))).toBe(true);
    expect(
      isUsable(makeObservation({ id: "b", date: "2026-01-01", ndvi: 0.3, ndbi: 0.1, bsi: 0.1, cloudPercent: 80, validPixelPercent: 20 }))
    ).toBe(false);
    expect(
      isUsable(makeObservation({ id: "c", date: "2026-01-01", ndvi: 0.3, ndbi: 0.1, bsi: 0.1, quality: "LOW_QUALITY" }))
    ).toBe(false);
  });
});

describe("evaluateSite — data gap protection", () => {
  it("reports DATA_GAP (never STASIS) with too few usable observations", () => {
    const obs = [
      makeObservation({ id: "a", date: "2026-09-01", ndvi: 0.5, ndbi: 0, bsi: 0 }),
      makeObservation({ id: "b", date: "2026-09-11", ndvi: 0.2, ndbi: 0.2, bsi: 0.2 }),
    ];
    const ev = evaluateSite(obs, undefined, new Date("2026-09-12T00:00:00Z"));
    expect(ev.status).toBe("DATA_GAP");
    expect(ev.stasis.score).toBe(0);
  });

  it("reports DATA_GAP when the latest usable observation is stale", () => {
    const obs = [
      makeObservation({ id: "1", date: "2026-01-01", ndvi: 0.6, ndbi: -0.1, bsi: -0.1 }),
      makeObservation({ id: "2", date: "2026-01-11", ndvi: 0.4, ndbi: 0.05, bsi: 0.05 }),
      makeObservation({ id: "3", date: "2026-01-21", ndvi: 0.3, ndbi: 0.1, bsi: 0.1 }),
      makeObservation({ id: "4", date: "2026-01-31", ndvi: 0.29, ndbi: 0.11, bsi: 0.11 }),
    ];
    // "now" is months later -> latest observation is far too old to conclude anything
    const ev = evaluateSite(obs, undefined, new Date("2026-06-01T00:00:00Z"));
    expect(ev.status).toBe("DATA_GAP");
  });

  it("does not convert an empty observation set into STASIS", () => {
    const ev = evaluateSite([], undefined, new Date("2026-09-12T00:00:00Z"));
    expect(ev.status).toBe("DATA_GAP");
    expect(ev.stasis.score).toBe(0);
  });
});
