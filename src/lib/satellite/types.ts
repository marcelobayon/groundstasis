import type { GeoJSONPolygon } from "@/lib/geo/types";

/** A site as the satellite layer needs to see it. */
export interface ProviderSite {
  id: string;
  name?: string;
  geometry: GeoJSONPolygon;
  areaAcres?: number;
}

export interface DateRange {
  /** ISO datetime */
  from: string;
  /** ISO datetime */
  to: string;
}

export interface ObservationMetadata {
  observationId: string;
  date: string;
  provider: string;
  cloudPercent?: number;
  [key: string]: unknown;
}

export interface PreviewImage {
  /** remote URL (e.g. Process API true-colour PNG) */
  url?: string;
  /** inline data URI (demo provider uses generated SVG/PNG) */
  dataUri?: string;
  width: number;
  height: number;
  label?: string;
  isDemo?: boolean;
}
