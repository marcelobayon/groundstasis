import { describe, it, expect } from "vitest";
import { subscriptionMonthlyTotal, clampCdiSites, DRAW_INTELLIGENCE } from "./pricing";

describe("subscriptionMonthlyTotal", () => {
  // The exact table from the build spec.
  const cases: Array<[Parameters<typeof subscriptionMonthlyTotal>[0], number, number]> = [
    ["foundation", 0, 19],
    ["foundation", 1, 34],
    ["portfolio", 0, 49],
    ["portfolio", 1, 64],
    ["portfolio", 3, 94],
    ["pro", 0, 99],
    ["pro", 1, 114],
    ["pro", 5, 174],
    ["pro", 10, 249],
  ];
  it.each(cases)("%s with %i CDI sites = $%i/mo", (tier, cdi, total) => {
    expect(subscriptionMonthlyTotal(tier, cdi)).toBe(total);
  });

  it("clamps CDI sites to the plan's seat count", () => {
    expect(subscriptionMonthlyTotal("foundation", 2)).toBe(34); // 1 seat max
    expect(subscriptionMonthlyTotal("pro", 11)).toBe(249); // 10 seat max
    expect(clampCdiSites("portfolio", 99)).toBe(3);
    expect(clampCdiSites("foundation", -5)).toBe(0);
  });

  it("CDI add-on is $15/site", () => {
    expect(DRAW_INTELLIGENCE.amount).toBe(15);
  });
});
