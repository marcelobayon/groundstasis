import type { Baseline, ObservationChange } from "./types";
import { median, stdev } from "./statistics";
import { STASIS_CONFIG, type StasisConfig } from "./config";

/**
 * Build a site-specific baseline of "normal" change behaviour.
 *
 * The baseline is the central tendency of the site's HISTORICAL change
 * intervals, excluding the most recent window (which is what we are testing for
 * stasis — we must not let the thing we are testing define "normal"). We use the
 * median to resist single large jumps (e.g. one dramatic clearing event).
 */
export function computeBaseline(
  changes: ObservationChange[],
  config: StasisConfig = STASIS_CONFIG
): Baseline {
  const historical = changes.slice(0, Math.max(0, changes.length - config.recentWindow));
  const values = historical.map((c) => c.siteChangePercent);
  return {
    established: values.length >= config.minBaselineIntervals,
    medianChangePercent: median(values),
    stDevChangePercent: stdev(values),
    sampleSize: values.length,
  };
}
