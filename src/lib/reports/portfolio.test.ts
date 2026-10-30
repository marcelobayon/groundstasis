import { describe, it, expect } from "vitest";
import {
  summarizePortfolio,
  isException,
  STATUS_ORDER,
  type PortfolioSite,
} from "./portfolio";
import type { SiteStatus } from "@/lib/analysis/types";

function site(status: SiteStatus, stasisScore = 0, name: string = status): PortfolioSite {
  return {
    id: `${name}-${stasisScore}`,
    name,
    address: null,
    status,
    stasisScore,
    confidence: "MEDIUM",
    lastEvaluatedAt: null,
  };
}

describe("summarizePortfolio", () => {
  it("returns zeroed counts and no exceptions for an empty portfolio", () => {
    const s = summarizePortfolio([]);
    expect(s.total).toBe(0);
    expect(s.exceptions).toEqual([]);
    expect(s.exceptionCount).toBe(0);
    for (const status of STATUS_ORDER) {
      expect(s.counts[status]).toBe(0);
    }
  });

  it("counts each status independently", () => {
    const s = summarizePortfolio([
      site("ACTIVE"),
      site("ACTIVE"),
      site("WATCH"),
      site("REVIEW"),
      site("STASIS"),
      site("DATA_GAP"),
    ]);
    expect(s.total).toBe(6);
    expect(s.counts.ACTIVE).toBe(2);
    expect(s.counts.WATCH).toBe(1);
    expect(s.counts.REVIEW).toBe(1);
    expect(s.counts.STASIS).toBe(1);
    expect(s.counts.DATA_GAP).toBe(1);
  });

  it("treats REVIEW, STASIS, and DATA_GAP as exceptions but not ACTIVE or WATCH", () => {
    expect(isException("ACTIVE")).toBe(false);
    expect(isException("WATCH")).toBe(false);
    expect(isException("REVIEW")).toBe(true);
    expect(isException("STASIS")).toBe(true);
    expect(isException("DATA_GAP")).toBe(true);

    const s = summarizePortfolio([site("ACTIVE"), site("WATCH"), site("REVIEW")]);
    expect(s.exceptionCount).toBe(1);
    expect(s.exceptions.map((e) => e.status)).toEqual(["REVIEW"]);
  });

  it("orders exceptions most-severe first, then by stasis score", () => {
    const s = summarizePortfolio([
      site("REVIEW", 60, "review-60"),
      site("STASIS", 80, "stasis-80"),
      site("STASIS", 90, "stasis-90"),
      site("DATA_GAP", 0, "gap"),
      site("ACTIVE", 10, "active"),
    ]);
    expect(s.exceptions.map((e) => e.name)).toEqual([
      "stasis-90",
      "stasis-80",
      "review-60",
      "gap",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [site("STASIS", 5), site("ACTIVE", 1)];
    const copy = [...input];
    summarizePortfolio(input);
    expect(input).toEqual(copy);
  });
});
