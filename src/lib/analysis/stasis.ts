import type { Baseline, ObservationChange, StasisResult } from "./types";
import { STASIS_CONFIG, type StasisConfig } from "./config";
import { clamp, mean } from "./statistics";

/**
 * Deterministic stasis score (0..100).
 *
 *   score = recentLowChange + historicalDeviation + duration + consecutive
 *           - dataQualityPenalty            (then clamped to 0..100)
 *
 * All weights live in STASIS_CONFIG. This is a transparent heuristic, NOT a
 * probability of abandonment. A high score means: "recent usable observations
 * resemble an unusually inactive period relative to this site's own baseline."
 *
 * The score intentionally requires MULTIPLE conditions to align
 * (low recent change AND persistence AND consecutive low intervals AND good
 * data quality) rather than firing on low change alone.
 */
export function computeStasis(
  changes: ObservationChange[],
  baseline: Baseline,
  dataQuality: number, // 0..1  (1 = pristine)
  config: StasisConfig = STASIS_CONFIG
): StasisResult {
  const w = config.weights;
  const base = baseline.medianChangePercent;

  // Recent change = mean of the last `recentWindow` intervals.
  const recentIntervals = changes.slice(-config.recentWindow);
  const recentChange = recentIntervals.length
    ? mean(recentIntervals.map((c) => c.siteChangePercent))
    : 0;

  // Low-change threshold for THIS site (relative to its own baseline).
  const lowThreshold = base * config.lowChangeFractionOfBaseline;

  // Count consecutive trailing low-change intervals and their total duration.
  let consecutiveLowChange = 0;
  let lowChangeDurationDays = 0;
  for (let i = changes.length - 1; i >= 0; i--) {
    if (base > 0 && changes[i].siteChangePercent < lowThreshold) {
      consecutiveLowChange++;
      lowChangeDurationDays += changes[i].daysBetween;
    } else {
      break;
    }
  }

  // 1. recentLowChange — how far recent sits below baseline (deficit 0..1)
  const deficit = base > 0 ? clamp(1 - recentChange / base, 0, 1) : 0;
  const recentLowChange = deficit * w.recentLowChange;

  // 2. historicalDeviation — std devs recent sits below baseline
  const z =
    baseline.stDevChangePercent > 0 ? (base - recentChange) / baseline.stDevChangePercent : 0;
  const historicalDeviation =
    clamp(z / config.historicalDeviationFullZ, 0, 1) * w.historicalDeviation;

  // 3. duration — trailing low-change days vs strong-stasis threshold
  const duration =
    clamp(lowChangeDurationDays / config.minDaysForStrongStasis, 0, 1) * w.duration;

  // 4. consecutive — trailing low-change count vs required
  const consecutive =
    clamp(consecutiveLowChange / config.consecutiveLowChangeRequired, 0, 1) * w.consecutive;

  // 5. data-quality penalty (subtracted)
  const dataQualityPenalty = (1 - clamp(dataQuality, 0, 1)) * w.dataQualityPenalty;

  const raw =
    recentLowChange + historicalDeviation + duration + consecutive - dataQualityPenalty;
  const score = Math.round(clamp(raw, 0, 100));

  return {
    score,
    components: {
      recentLowChange,
      historicalDeviation,
      duration,
      consecutive,
      dataQualityPenalty,
    },
    recentChangePercent: recentChange,
    baselineChangePercent: base,
    consecutiveLowChange,
    lowChangeDurationDays,
  };
}
