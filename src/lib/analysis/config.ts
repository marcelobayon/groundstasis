import type { SiteStatus } from "./types";

/**
 * STASIS_CONFIG — initial heuristic thresholds and weights.
 *
 * IMPORTANT: These are PRODUCT DEFAULTS, not scientific facts. They are
 * intentionally conservative and are expected to be calibrated against real
 * labelled sites over time. Every stored analysis records which version of this
 * config it used (`thresholdsVersion`), so historical scores remain
 * reproducible even after these values change (see ALGORITHM.md, "Versioning").
 */

export const ANALYSIS_VERSION = "stasis-v0.1";
export const THRESHOLDS_VERSION = "thresholds-v0.1";

export interface StasisConfig {
  // --- evidence sufficiency ---
  /** minimum usable observations before any determination is allowed */
  minValidObservations: number;
  /** minimum usable change-intervals before a baseline is "established" */
  minBaselineIntervals: number;
  /** a candidate must span at least this many days to be a stasis candidate */
  minDaysForStasisCandidate: number;
  /** a strong stasis signal earns full "duration" credit at this many days */
  minDaysForStrongStasis: number;

  // --- low-change definition ---
  /** recent window (# of most-recent usable obs) used for "recent change" */
  recentWindow: number;
  /** an interval counts as "low change" below this fraction of the baseline */
  lowChangeFractionOfBaseline: number;
  /** consecutive low-change intervals required for full "consecutive" credit */
  consecutiveLowChangeRequired: number;

  // --- scoring weights (positive components sum to 100) ---
  weights: {
    recentLowChange: number;
    historicalDeviation: number;
    duration: number;
    consecutive: number;
    /** max points subtracted for poor data quality */
    dataQualityPenalty: number;
  };
  /** z-score (std devs below baseline) that earns full historicalDeviation */
  historicalDeviationFullZ: number;

  // --- status bands (upper bound of each band, by score) ---
  statusBands: { active: number; watch: number; review: number };

  // --- per-observation quality ---
  /** below this usable-pixel % an observation is LOW_QUALITY */
  minUsablePixelPercent: number;
  /** above this cloud % an observation is LOW_QUALITY */
  maxCloudPercent: number;
  confidence: {
    /** continuous score >= this -> HIGH */
    highScore: number;
    /** continuous score >= this -> MEDIUM (else LOW) */
    mediumScore: number;
    /** usable observations that earn full "evidence volume" credit */
    fullEvidenceObservations: number;
  };
  /** if a stasis-range score has only LOW confidence, cap status here */
  lowConfidenceStatusCap: SiteStatus;

  // --- data gap ---
  /** if the most recent usable observation is older than this, it's a DATA GAP */
  maxDaysSinceUsableObservation: number;

  // --- geometry suitability (heuristic, acres) ---
  geometry: {
    insufficientBelowAcres: number;
    limitedBelowAcres: number;
  };
}

export const STASIS_CONFIG: StasisConfig = {
  minValidObservations: 3,
  minBaselineIntervals: 2,
  minDaysForStasisCandidate: 10,
  minDaysForStrongStasis: 15,

  recentWindow: 2,
  lowChangeFractionOfBaseline: 0.4,
  consecutiveLowChangeRequired: 3,

  weights: {
    recentLowChange: 40,
    historicalDeviation: 20,
    duration: 20,
    consecutive: 20,
    dataQualityPenalty: 20,
  },
  historicalDeviationFullZ: 2,

  statusBands: { active: 24, watch: 49, review: 74 },

  minUsablePixelPercent: 60,
  maxCloudPercent: 40,
  confidence: {
    highScore: 0.7,
    mediumScore: 0.4,
    fullEvidenceObservations: 5,
  },
  lowConfidenceStatusCap: "REVIEW",

  maxDaysSinceUsableObservation: 21,

  geometry: {
    insufficientBelowAcres: 0.5,
    limitedBelowAcres: 2,
  },
};
