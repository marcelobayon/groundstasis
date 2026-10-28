import { describe, it, expect } from "vitest";
import { analyzeSite } from "./analyze-site";
import { DemoProvider } from "@/lib/satellite/demo-provider";
import type { SatelliteProvider } from "@/lib/satellite/provider";
import { DEMO_SITE } from "@/data/demo-site";

describe("analyzeSite job", () => {
  it("runs the demo cycle, reaches STASIS, and emits + 'sends' a stasis alert", async () => {
    const res = await analyzeSite({
      provider: new DemoProvider(),
      site: { id: "demo", name: DEMO_SITE.name, geometry: DEMO_SITE.geometry },
      siteName: DEMO_SITE.name,
      loanNumber: DEMO_SITE.loanNumber,
      recipientEmail: "lender@example.com",
      previousStatus: "REVIEW",
      now: new Date(DEMO_SITE.asOf),
    });
    expect(res.evaluation.status).toBe("STASIS");
    expect(res.alerts.map((a) => a.type)).toContain("STASIS_DETECTED");
    expect(res.emailsSent.length).toBeGreaterThanOrEqual(1);
    expect(res.emailsSent[0].result.delivered).toBe(true);
    expect(res.run.status).toBe("COMPLETE");
  });

  it("degrades a provider failure to DATA_GAP and never emits a stasis alert", async () => {
    const failing: SatelliteProvider = {
      name: "boom",
      isDemo: false,
      isConfigured: () => true,
      async getAvailableObservations() {
        throw new Error("satellite API down");
      },
      async getObservationMetadata() {
        return null;
      },
      async getPreview() {
        return null;
      },
    };
    const res = await analyzeSite({
      provider: failing,
      site: { id: "x", geometry: DEMO_SITE.geometry },
      siteName: "X",
      previousStatus: "ACTIVE",
      now: new Date(DEMO_SITE.asOf),
    });
    expect(res.run.status).toBe("FAILED");
    expect(res.evaluation.status).toBe("DATA_GAP");
    expect(res.alerts.find((a) => a.type === "STASIS_DETECTED")).toBeUndefined();
  });
});
