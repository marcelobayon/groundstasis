import type { Observation } from "@/lib/analysis/types";
import type { SatelliteProvider } from "./provider";
import type { ProviderSite, DateRange, ObservationMetadata, PreviewImage } from "./types";
import { DEMO_SITE } from "@/data/demo-site";

/**
 * DemoProvider — serves the synthetic DEMO_SITE timeline. It never contacts a
 * satellite source and every observation is flagged `isDemo: true`. Used for
 * the public demo, local development, and tests.
 */
export class DemoProvider implements SatelliteProvider {
  readonly name = "demo";
  readonly isDemo = true;

  isConfigured(): boolean {
    return true;
  }

  async getAvailableObservations(_site: ProviderSite, range?: DateRange): Promise<Observation[]> {
    const obs = DEMO_SITE.observations;
    if (!range) return obs;
    return obs.filter((o) => o.date >= range.from.slice(0, 10) && o.date <= range.to.slice(0, 10));
  }

  async getObservationMetadata(observationId: string): Promise<ObservationMetadata | null> {
    const o = DEMO_SITE.observations.find((x) => x.observationId === observationId);
    if (!o) return null;
    return {
      observationId: o.observationId,
      date: o.date,
      provider: "demo",
      cloudPercent: o.cloudPercent,
      validPixelPercent: o.validPixelPercent,
      isDemo: true,
    };
  }

  async getPreview(_site: ProviderSite, observationId: string): Promise<PreviewImage | null> {
    const o = DEMO_SITE.observations.find((x) => x.observationId === observationId);
    if (!o) return null;
    // A deterministic, clearly-synthetic SVG "scene" driven by the indices.
    // This is a schematic, NOT imagery. See components/EvidenceImage for render.
    return {
      dataUri: undefined,
      width: 320,
      height: 320,
      label: "DEMO DATA — schematic, not satellite imagery",
      isDemo: true,
    };
  }
}
