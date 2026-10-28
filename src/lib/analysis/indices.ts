import type { BandStats } from "./types";
import { mean, median, stdev, minOf, maxOf } from "./statistics";

// Spectral index calculations for Sentinel-2 L2A surface reflectance.
//
// SCIENTIFIC NOTE: NDVI / NDBI / BSI are INDIRECT signals. They do not directly
// measure concrete, framing, roofing, abandonment, or loan performance. Ground
// Stasis uses them only as complementary inputs to a temporal change heuristic.
// See METHODOLOGY.md.

const EPS = 1e-10;

/** Safe normalized difference (a - b)/(a + b). Returns null when undefined. */
export function normalizedDifference(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const denom = a + b;
  if (Math.abs(denom) < EPS) return null; // divide-by-zero -> treat as missing
  return (a - b) / denom;
}

/** NDVI = (NIR - Red)/(NIR + Red) = (B08 - B04)/(B08 + B04). */
export function ndvi(nir: number, red: number): number | null {
  return normalizedDifference(nir, red);
}

/** NDBI = (SWIR - NIR)/(SWIR + NIR) = (B11 - B08)/(B11 + B08). */
export function ndbi(swir: number, nir: number): number | null {
  return normalizedDifference(swir, nir);
}

/**
 * BSI (Bare Soil Index):
 *   ((B11 + B04) - (B08 + B02)) / ((B11 + B04) + (B08 + B02))
 */
export function bsi(swir: number, red: number, nir: number, blue: number): number | null {
  if (![swir, red, nir, blue].every(Number.isFinite)) return null;
  const num = swir + red - (nir + blue);
  const den = swir + red + nir + blue;
  if (Math.abs(den) < EPS) return null;
  return num / den;
}

/** A single multispectral pixel's reflectance values (Sentinel-2 L2A). */
export interface Pixel {
  B02: number; // blue  (native 10 m)
  B04: number; // red   (native 10 m)
  B08: number; // NIR   (native 10 m)
  B11: number; // SWIR  (native 20 m — resampled to the working grid)
  /** 1 = valid, 0 = masked (cloud / shadow / snow / no-data) */
  valid?: number;
}

export interface PixelIndices {
  ndvi: number;
  ndbi: number;
  bsi: number;
}

/** Indices for one pixel; null if masked or mathematically undefined. */
export function pixelIndices(p: Pixel): PixelIndices | null {
  if (p.valid === 0) return null;
  const v = ndvi(p.B08, p.B04);
  const b = ndbi(p.B11, p.B08);
  const s = bsi(p.B11, p.B04, p.B08, p.B02);
  if (v === null || b === null || s === null) return null;
  return { ndvi: v, ndbi: b, bsi: s };
}

export function bandStats(values: number[]): BandStats {
  return {
    mean: mean(values),
    median: median(values),
    stDev: stdev(values),
    min: minOf(values),
    max: maxOf(values),
    sampleCount: values.length,
  };
}

/** Parallel band arrays over the polygon, with an optional validity mask. */
export interface Scene {
  B02: number[];
  B04: number[];
  B08: number[];
  B11: number[];
  /** per-pixel validity (1 valid / 0 masked). If absent, all pixels are valid. */
  mask?: number[];
}

export interface SiteMetrics {
  ndvi: BandStats;
  ndbi: BandStats;
  bsi: BandStats;
  totalPixels: number;
  validPixelPercent: number;
}

/**
 * Reduce a raster scene to site-level index statistics, excluding masked /
 * undefined pixels safely. This is what a future raster-based SatelliteProvider
 * would call; the Statistical-API provider gets equivalent numbers directly from
 * the server, honouring the Scene Classification (SCL) cloud mask.
 */
export function siteMetricsFromScene(scene: Scene): SiteMetrics {
  const total = scene.B04.length;
  const ndviVals: number[] = [];
  const ndbiVals: number[] = [];
  const bsiVals: number[] = [];
  for (let i = 0; i < total; i++) {
    const idx = pixelIndices({
      B02: scene.B02[i],
      B04: scene.B04[i],
      B08: scene.B08[i],
      B11: scene.B11[i],
      valid: scene.mask ? scene.mask[i] : 1,
    });
    if (!idx) continue;
    ndviVals.push(idx.ndvi);
    ndbiVals.push(idx.ndbi);
    bsiVals.push(idx.bsi);
  }
  return {
    ndvi: bandStats(ndviVals),
    ndbi: bandStats(ndbiVals),
    bsi: bandStats(bsiVals),
    totalPixels: total,
    validPixelPercent: total === 0 ? 0 : (ndviVals.length / total) * 100,
  };
}
