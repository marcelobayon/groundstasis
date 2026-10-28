// Core domain types for the Ground Stasis analysis engine.
//
// These are deliberately provider-agnostic: an "observation" is a set of
// site-level statistics, regardless of whether they came from the Copernicus
// Statistical API, a future raster pipeline, or clearly-labelled demo data.

export type QualityStatus = "OK" | "LOW_QUALITY";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type SiteStatus = "ACTIVE" | "WATCH" | "REVIEW" | "STASIS" | "DATA_GAP";

/** Summary statistics for a single spectral index over the site polygon. */
export interface BandStats {
  mean: number;
  median: number;
  stDev: number;
  min: number;
  max: number;
  /** number of valid (unmasked) pixels the stats were computed from */
  sampleCount: number;
}

/**
 * One usable (or attempted) satellite observation, reduced to site-level
 * statistics. This is the atomic unit the temporal engine reasons over.
 */
export interface Observation {
  observationId: string;
  /** ISO date (acquisition date) */
  date: string;
  provider: string;
  /** index statistics over valid pixels */
  ndvi: BandStats;
  ndbi: BandStats;
  bsi: BandStats;
  /** 0..100 — fraction of the polygon that produced valid pixels */
  validPixelPercent: number;
  /** 0..100 — estimated cloud/shadow/snow contamination over the site */
  cloudPercent: number;
  /** engine/provider assessment of this single observation */
  qualityStatus: QualityStatus;
  /** true when this is demonstration data, never real satellite analysis */
  isDemo?: boolean;
}

/** Change between two consecutive usable observations. */
export interface ObservationChange {
  fromObservationId: string;
  toObservationId: string;
  fromDate: string;
  toDate: string;
  daysBetween: number;
  deltaNdvi: number;
  deltaNdbi: number;
  deltaBsi: number;
  /** normalized site-change metric, expressed as a percent (see change.ts) */
  siteChangePercent: number;
  /** siteChangePercent per day */
  changeVelocity: number;
}

/** The computed baseline for a site (site-specific "normal" behaviour). */
export interface Baseline {
  established: boolean;
  /** median of historical site-change values (percent) */
  medianChangePercent: number;
  /** spread of historical site-change values */
  stDevChangePercent: number;
  /** number of usable change intervals the baseline was built from */
  sampleSize: number;
}

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  /** 0..1 continuous score behind the level */
  score: number;
  reasons: string[];
}

/** Sub-scores that make up the stasis score — stored for auditability. */
export interface StasisComponents {
  recentLowChange: number;
  historicalDeviation: number;
  duration: number;
  consecutive: number;
  dataQualityPenalty: number;
}

export interface StasisResult {
  /** 0..100 monitoring score — NOT a probability of abandonment */
  score: number;
  components: StasisComponents;
  recentChangePercent: number;
  baselineChangePercent: number;
  consecutiveLowChange: number;
  lowChangeDurationDays: number;
}

/**
 * The full result of evaluating a site at a point in time. Everything needed to
 * reproduce and audit the decision is included (see AUDITABILITY in the spec).
 */
export interface SiteEvaluation {
  status: SiteStatus;
  stasis: StasisResult;
  confidence: ConfidenceAssessment;
  baseline: Baseline;
  latestObservation?: Observation;
  previousObservation?: Observation;
  usableObservationCount: number;
  /** human-readable, cautious explanation of the status */
  explanation: string;
  reasons: string[];
  // --- audit metadata ---
  analysisVersion: string;
  thresholdsVersion: string;
  evaluatedAt: string;
}
