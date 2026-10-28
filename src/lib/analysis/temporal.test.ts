import { describe, it, expect } from "vitest";
import { evaluateSite, isUsable } from "./status";
import { decideAlerts } from "./alerts";
import { DEMO_SITE } from "@/data/demo-site";
import { makeObservation } from "@/test/fixtures";
import type { Observation, SiteStatus } from "./types";

// Walks the demo timeline forward and asserts the escalation ladder
// ACTIVE -> WATCH -> ... -> STASIS, then a resume back to activity.

const usable = DEMO_SITE.observations.filter((o) => isUsable(o)).sort((a, b) => a.date.localeCompare(b.date));

function statusAfter(n: number): SiteStatus {
  const subset = usable.slice(0, n);
  const asOf = new Date(`${subset[subset.length - 1].date}T12:00:00Z`);
  return evaluateSite(subset, undefined, asOf).status;
}

describe("temporal escalation (ACTIVE -> WATCH -> STASIS -> ACTIVE)", () => {
  it("starts ACTIVE while the site is still changing", () => {
    expect(statusAfter(4)).toBe("ACTIVE");
  });

  it("passes through WATCH as change moderates", () => {
    expect(statusAfter(5)).toBe("WATCH");
  });

  it("escalates to a non-ACTIVE, non-STASIS review state mid-decline", () => {
    expect(["WATCH", "REVIEW"]).toContain(statusAfter(7));
  });

  it("reaches STASIS with HIGH confidence once the site is persistently quiet", () => {
    const subset = usable.slice(0, usable.length);
    const asOf = new Date(DEMO_SITE.asOf);
    const ev = evaluateSite(subset, undefined, asOf);
    expect(ev.status).toBe("STASIS");
    expect(ev.confidence.level).toBe("HIGH");
  });

  it("returns to activity (and fires ACTIVITY_RESUMED) when change resumes", () => {
    const last = usable[usable.length - 1];
    // A big renewed-change observation ~7 days later.
    const resume: Observation = makeObservation({
      id: "obs-resume",
      date: "2026-10-01",
      ndvi: last.ndvi.mean - 0.14,
      ndbi: last.ndbi.mean + 0.14,
      bsi: last.bsi.mean + 0.14,
      validPixelPercent: 95,
      cloudPercent: 5,
    });
    const asOf = new Date("2026-10-02T12:00:00Z");
    const ev = evaluateSite([...usable, resume], undefined, asOf);
    expect(["ACTIVE", "WATCH"]).toContain(ev.status);

    const alerts = decideAlerts({ siteId: "demo", previousStatus: "STASIS", evaluation: ev });
    expect(alerts.map((a) => a.type)).toContain("ACTIVITY_RESUMED");
  });
});
