import { describe, it, expect } from "vitest";
import { alertTypeToEvent, isWebhookEvent, WEBHOOK_EVENTS } from "./events";

describe("webhook event catalog", () => {
  it("maps each monitoring alert type to its event", () => {
    expect(alertTypeToEvent("STASIS_DETECTED")).toBe("stasis.detected");
    expect(alertTypeToEvent("ACTIVITY_RESUMED")).toBe("activity.resumed");
    expect(alertTypeToEvent("DATA_GAP")).toBe("data_gap.detected");
    expect(alertTypeToEvent("OBSERVATION_AVAILABLE")).toBe("observation.available");
    expect(alertTypeToEvent("SOMETHING_ELSE")).toBeNull();
  });

  it("validates event names", () => {
    expect(isWebhookEvent("stasis.detected")).toBe(true);
    expect(isWebhookEvent("site.status_changed")).toBe(true);
    expect(isWebhookEvent("not.an.event")).toBe(false);
    expect(WEBHOOK_EVENTS).toContain("stasis.detected");
    expect(WEBHOOK_EVENTS).toHaveLength(5);
  });
});
