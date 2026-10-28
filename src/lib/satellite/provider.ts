import type { Observation } from "@/lib/analysis/types";
import type { ProviderSite, DateRange, ObservationMetadata, PreviewImage } from "./types";

/**
 * SatelliteProvider — the seam between Ground Stasis and any imagery source.
 *
 * The MVP ships two implementations: a DemoProvider (labelled DEMO DATA) and a
 * Copernicus Data Space / Sentinel Hub Statistical API provider. Landsat,
 * Sentinel-1 SAR, or commercial high-resolution providers can be added later by
 * implementing this interface — no changes to the analysis engine are required.
 *
 * Design note: the MVP uses a *statistics* API, so cloud masking and per-pixel
 * band reads happen server-side. `getBandData` / `getCloudMask` are therefore
 * OPTIONAL and exist only so a future raster provider can expose them.
 */
export interface SatelliteProvider {
  readonly name: string;
  readonly isDemo: boolean;

  /** True when the provider has everything it needs to make live calls. */
  isConfigured(): boolean;

  /** Site-level observations (as statistics) over a date range. */
  getAvailableObservations(site: ProviderSite, range: DateRange): Promise<Observation[]>;

  /** Metadata for a single observation (used by the evidence view). */
  getObservationMetadata(observationId: string): Promise<ObservationMetadata | null>;

  /** A preview image for an observation (optional; demo generates one). */
  getPreview(site: ProviderSite, observationId: string): Promise<PreviewImage | null>;

  // --- optional, raster-only extensions (not used by the stats MVP) ---
  getBandData?(observationId: string, bands: string[]): Promise<number[][] | null>;
  getCloudMask?(observationId: string): Promise<number[] | null>;
}
