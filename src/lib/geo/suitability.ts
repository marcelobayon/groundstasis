import type { GeoJSONPolygon } from "./types";
import { polygonAreaAcres, SQ_M_PER_ACRE } from "./area";
import { STASIS_CONFIG, type StasisConfig } from "@/lib/analysis/config";

export type Suitability = "GOOD" | "LIMITED" | "INSUFFICIENT";

export interface SuitabilityResult {
  suitability: Suitability;
  areaAcres: number;
  /** approximate number of Sentinel-2 10 m pixels covering the site */
  approxPixels: number;
  message: string;
}

const S2_PIXEL_SQ_M = 100; // a 10 m x 10 m Sentinel-2 pixel

/**
 * Judge whether a site is large enough for 10 m-class analysis.
 *
 * HEURISTIC, not a guaranteed threshold. Small sites produce fewer pixels, so
 * site-level statistics are noisier and stasis signals less reliable.
 */
export function assessSuitability(
  polygon: GeoJSONPolygon,
  config: StasisConfig = STASIS_CONFIG
): SuitabilityResult {
  const areaAcres = polygonAreaAcres(polygon);
  const approxPixels = Math.round((areaAcres * SQ_M_PER_ACRE) / S2_PIXEL_SQ_M);

  if (areaAcres < config.geometry.insufficientBelowAcres) {
    return {
      suitability: "INSUFFICIENT",
      areaAcres,
      approxPixels,
      message:
        "This site is likely too small for reliable 10 m-class satellite analysis. Ground Stasis works best on larger construction sites where physical changes cover multiple satellite pixels.",
    };
  }
  if (areaAcres < config.geometry.limitedBelowAcres) {
    return {
      suitability: "LIMITED",
      areaAcres,
      approxPixels,
      message:
        "This site is on the small side for 10 m-class imagery. Signals may be noisier — treat results with extra caution.",
    };
  }
  return {
    suitability: "GOOD",
    areaAcres,
    approxPixels,
    message: "This site is large enough for Sentinel-2 10 m-class analysis.",
  };
}
