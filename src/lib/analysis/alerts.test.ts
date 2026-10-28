import { describe, it, expect } from "vitest";
import { decideAlerts } from "./alerts";
import { evaluateSite } from "./status";
import { DEMO_SITE } from "@/data/demo-site";

const stasisEval = evaluateSite(DEMO_SITE.observations, undefined, new Date(DEMO_SITE.asOf));

describe("alert decisions", () => {
  it("demo evaluation is in STASIS (precondition)", () => {
    expect(stasisEval.status).toBe("STASIS");
  });

  it("emits STASIS_DETECTED when entering stasis", () => {
    const alerts = decideAlerts({ siteId: "demo", previousStatus: "REVIEW", evaluation: stasisEval });
    expect(alerts.map((a) => a.type)).toContain("STASIS_DETECTED");
  });

  it("does not re-emit an already-sent alert (idempotent)", () => {
    const obsId = stasisEval.latestObservation!.observationId;
    const alreadySent = new Set([`demo:STASIS_DETECTED:${obsId}`]);
    const alerts = decideAlerts({ siteId: "demo", previousStatus: "REVIEW", evaluation: stasisEval, alreadySent });
    expect(alerts.map((a) => a.type)).not.toContain("STASIS_DETECTED");
  });

  it("does not alert when the status is unchanged", () => {
    const active = { ...stasisEval, status: "ACTIVE" as const };
    const alerts = decideAlerts({ siteId: "demo", previousStatus: "ACTIVE", evaluation: active });
    expect(alerts).toHaveLength(0);
  });

  it("emits ACTIVITY_RESUMED leaving stasis for activity", () => {
    const resumed = { ...stasisEval, status: "ACTIVE" as const };
    const alerts = decideAlerts({ siteId: "demo", previousStatus: "STASIS", evaluation: resumed });
    expect(alerts.map((a) => a.type)).toContain("ACTIVITY_RESUMED");
  });

  it("emits DATA_GAP on entering a data gap", () => {
    const gap = { ...stasisEval, status: "DATA_GAP" as const };
    const alerts = decideAlerts({ siteId: "demo", previousStatus: "ACTIVE", evaluation: gap });
    expect(alerts.map((a) => a.type)).toContain("DATA_GAP");
    expect(alerts.map((a) => a.type)).not.toContain("STASIS_DETECTED");
  });

  it("emits OBSERVATION_AVAILABLE for a new observation when asked", () => {
    const active = { ...stasisEval, status: "ACTIVE" as const };
    const alerts = decideAlerts({
      siteId: "demo",
      previousStatus: "ACTIVE",
      evaluation: active,
      latestObservationIsNew: true,
    });
    expect(alerts.map((a) => a.type)).toContain("OBSERVATION_AVAILABLE");
  });
});
