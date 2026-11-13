// Phase 2 validation harness. Orchestration only: for each labeled site it loads
// that site's observation history, runs the SAME engine the product runs, maps
// the result to a validation class, and computes the report. The observation
// loader is injected so this is testable offline and agnostic to where the
// observations come from (DB rows, a re-pull from CDSE, a fixture).

import { evaluateSite, STASIS_CONFIG } from "@/lib/analysis";
import type { Observation, SiteEvaluation } from "@/lib/analysis/types";
import { computeReport, statusToClass, type PredictedClass, type Sample, type ValidationReport } from "./metrics";
import type { GroundTruth, SiteLabel } from "./labels";

/** Supplies the engine-shaped observations for a labeled site/period. */
export type ObservationLoader = (label: SiteLabel) => Promise<Observation[]>;

/** Defaults to the production engine; override for tests or alternate configs. */
export type Evaluator = (observations: Observation[], now: Date) => SiteEvaluation;

export interface PerSiteResult {
  siteId: string;
  truth: GroundTruth;
  predicted: PredictedClass;
  status: SiteEvaluation["status"];
  confidence: SiteEvaluation["confidence"]["level"];
  usableObservationCount: number;
  correct: boolean | null; // null when the engine abstained / had insufficient data
  source: string;
}

export interface ValidationRun {
  report: ValidationReport;
  perSite: PerSiteResult[];
}

const defaultEvaluate: Evaluator = (obs, now) => evaluateSite(obs, STASIS_CONFIG, now);

export async function runValidation(
  labels: SiteLabel[],
  loadObservations: ObservationLoader,
  evaluate: Evaluator = defaultEvaluate,
): Promise<ValidationRun> {
  const samples: Sample[] = [];
  const perSite: PerSiteResult[] = [];

  for (const label of labels) {
    const observations = await loadObservations(label);
    const ev = evaluate(observations, new Date(label.periodEnd));
    const predicted = statusToClass(ev.status);
    const confidence = ev.confidence.level;

    samples.push({ predicted, confidence, truth: label.groundTruth, siteId: label.siteId });

    const decisive = predicted === "ACTIVE" || predicted === "STALLED";
    perSite.push({
      siteId: label.siteId,
      truth: label.groundTruth,
      predicted,
      status: ev.status,
      confidence,
      usableObservationCount: ev.usableObservationCount,
      correct: decisive ? (predicted === "STALLED") === (label.groundTruth === "STALLED") : null,
      source: label.source,
    });
  }

  return { report: computeReport(samples), perSite };
}
