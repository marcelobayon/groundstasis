// Phase 2 — intelligence validation metrics. PURE and deterministic so the math
// is unit-tested in isolation, independent of CDSE, Prisma, or the engine.
//
// The engine emits a 5-way SiteStatus. For validation we collapse it to a
// decision about the thing that carries business risk — is the site STALLED? —
// while preserving the engine's right to ABSTAIN (REVIEW) or declare it has
// INSUFFICIENT evidence (DATA_GAP). Abstention and insufficiency are NOT counted
// as classification errors; they lower coverage instead. That distinction is the
// whole point: a model that abstains honestly must not look the same as one that
// guesses wrong.

import type { SiteStatus, ConfidenceLevel } from "@/lib/analysis/types";

/** Independently established reality for a site over a labeled period. */
export type GroundTruth = "ACTIVE" | "STALLED";

/** What the engine's status means as a validation decision. */
export type PredictedClass = "ACTIVE" | "STALLED" | "REVIEW" | "INSUFFICIENT";

export function statusToClass(status: SiteStatus): PredictedClass {
  switch (status) {
    case "ACTIVE":
    case "WATCH":
      return "ACTIVE"; // predicts the site is progressing
    case "STASIS":
      return "STALLED"; // predicts the site has stalled (the alert condition)
    case "REVIEW":
      return "REVIEW"; // engine abstains → manual review
    case "DATA_GAP":
      return "INSUFFICIENT"; // not enough usable imagery to decide
    default:
      return "INSUFFICIENT";
  }
}

export interface Sample {
  predicted: PredictedClass;
  confidence: ConfidenceLevel;
  truth: GroundTruth;
  siteId?: string;
}

const CONF_LEVELS: ConfidenceLevel[] = ["HIGH", "MEDIUM", "LOW"];

export interface ValidationReport {
  total: number;
  /** decisive = engine committed to ACTIVE or STALLED */
  decisive: number;
  coverage: number; // decisive / total
  abstainRate: number; // REVIEW / total
  insufficientRate: number; // INSUFFICIENT / total
  // Confusion matrix over DECISIVE samples; positive class = STALLED.
  confusion: { tp: number; fp: number; tn: number; fn: number };
  precision: number | null; // of STALLED calls, how many were truly stalled
  recall: number | null; // of truly stalled sites, how many we caught
  falsePositiveRate: number | null; // truly active sites we called stalled
  falseNegativeRate: number | null; // truly stalled sites we missed
  f1: number | null;
  accuracy: number | null; // correct decisive / decisive
  // Empirical accuracy within each confidence band — calibration check.
  calibration: Record<ConfidenceLevel, { n: number; accuracy: number | null }>;
}

const ratio = (num: number, den: number): number | null => (den === 0 ? null : num / den);

export function computeReport(samples: Sample[]): ValidationReport {
  const total = samples.length;
  const decisiveSamples = samples.filter((s) => s.predicted === "ACTIVE" || s.predicted === "STALLED");

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const s of decisiveSamples) {
    const predStalled = s.predicted === "STALLED";
    const truthStalled = s.truth === "STALLED";
    if (predStalled && truthStalled) tp++;
    else if (predStalled && !truthStalled) fp++;
    else if (!predStalled && !truthStalled) tn++;
    else fn++;
  }

  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : null;

  const calibration = {} as Record<ConfidenceLevel, { n: number; accuracy: number | null }>;
  for (const level of CONF_LEVELS) {
    const inBand = decisiveSamples.filter((s) => s.confidence === level);
    const correct = inBand.filter(
      (s) => (s.predicted === "STALLED") === (s.truth === "STALLED"),
    ).length;
    calibration[level] = { n: inBand.length, accuracy: ratio(correct, inBand.length) };
  }

  return {
    total,
    decisive: decisiveSamples.length,
    coverage: total === 0 ? 0 : decisiveSamples.length / total,
    abstainRate: total === 0 ? 0 : samples.filter((s) => s.predicted === "REVIEW").length / total,
    insufficientRate:
      total === 0 ? 0 : samples.filter((s) => s.predicted === "INSUFFICIENT").length / total,
    confusion: { tp, fp, tn, fn },
    precision,
    recall,
    falsePositiveRate: ratio(fp, fp + tn),
    falseNegativeRate: ratio(fn, fn + tp),
    f1,
    accuracy: ratio(tp + tn, decisiveSamples.length),
    calibration,
  };
}
