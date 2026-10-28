import type { Observation, SiteStatus, SiteEvaluation, StasisResult, Baseline, ConfidenceAssessment } from "./types";
import { STASIS_CONFIG, type StasisConfig, ANALYSIS_VERSION, THRESHOLDS_VERSION } from "./config";
import { changeSeries, daysBetween } from "./change";
import { computeBaseline } from "./baseline";
import { computeStasis } from "./stasis";
import { assessConfidence } from "./confidence";
import { clamp, mean } from "./statistics";

export function scoreToStatus(score: number, config: StasisConfig = STASIS_CONFIG): SiteStatus {
  const b = config.statusBands;
  if (score <= b.active) return "ACTIVE";
  if (score <= b.watch) return "WATCH";
  if (score <= b.review) return "REVIEW";
  return "STASIS";
}

/** Is a single observation good enough to use in temporal reasoning? */
export function isUsable(o: Observation, config: StasisConfig = STASIS_CONFIG): boolean {
  return (
    o.qualityStatus === "OK" &&
    o.validPixelPercent >= config.minUsablePixelPercent &&
    o.cloudPercent <= config.maxCloudPercent
  );
}

/** Mean per-observation data quality (0..1) over the given observations. */
function dataQualityOf(obs: Observation[]): number {
  if (obs.length === 0) return 0;
  return clamp(
    mean(obs.map((o) => clamp(o.validPixelPercent / 100 - 0.5 * (o.cloudPercent / 100), 0, 1))),
    0,
    1
  );
}

type Audit = Pick<
  SiteEvaluation,
  | "analysisVersion"
  | "thresholdsVersion"
  | "evaluatedAt"
  | "baseline"
  | "latestObservation"
  | "previousObservation"
  | "usableObservationCount"
>;

function emptyStasis(base: Baseline): StasisResult {
  return {
    score: 0,
    components: {
      recentLowChange: 0,
      historicalDeviation: 0,
      duration: 0,
      consecutive: 0,
      dataQualityPenalty: 0,
    },
    recentChangePercent: 0,
    baselineChangePercent: base.medianChangePercent,
    consecutiveLowChange: 0,
    lowChangeDurationDays: 0,
  };
}

function dataGap(audit: Audit, reasons: string[], explanation: string): SiteEvaluation {
  return {
    ...audit,
    status: "DATA_GAP",
    stasis: emptyStasis(audit.baseline),
    confidence: { level: "LOW", score: 0, reasons: ["Insufficient usable observations"] },
    explanation,
    reasons,
  };
}

function explain(
  status: SiteStatus,
  stasis: StasisResult,
  base: Baseline
): string {
  switch (status) {
    case "ACTIVE":
      return "Recent satellite observations show site-level change consistent with ongoing activity, in line with this site's established baseline.";
    case "WATCH":
      return "Observed site-level change has declined relative to this site's baseline, but the evidence is not yet sufficient for a stasis signal. Worth keeping an eye on.";
    case "REVIEW":
      return "Ground Stasis detected an anomaly that should be reviewed manually. Recent change is below baseline, but confidence or duration is not sufficient for a strong stasis signal.";
    case "STASIS":
      return (
        `Recent usable observations show substantially less site-level change ` +
        `(${stasis.recentChangePercent.toFixed(1)}%) than this site's established baseline ` +
        `(${base.medianChangePercent.toFixed(1)}%). ${stasis.consecutiveLowChange} consecutive usable ` +
        `observations show low change over ~${Math.round(stasis.lowChangeDurationDays)} days. ` +
        `Review the site before relying on the project schedule alone. This is an analytical signal — ` +
        `satellite evidence alone cannot determine whether construction has stopped, or why.`
      );
    case "DATA_GAP":
      return "Ground Stasis does not have enough usable imagery to evaluate recent activity.";
  }
}

function statusReasons(status: SiteStatus, stasis: StasisResult, base: Baseline): string[] {
  if (status === "ACTIVE" || status === "DATA_GAP") return [];
  return [
    `Recent change ${stasis.recentChangePercent.toFixed(1)}% vs baseline ${base.medianChangePercent.toFixed(1)}%`,
    `${stasis.consecutiveLowChange} consecutive low-change observation(s)`,
    `Low-change span ~${Math.round(stasis.lowChangeDurationDays)} days`,
  ];
}

/**
 * Evaluate a site from its full (chronological) observation history.
 *
 * `now` is injectable for deterministic tests and reproducibility. Observations
 * may arrive in any order; they are sorted defensively.
 *
 * CRITICAL: a lack of usable data is ALWAYS reported as DATA_GAP, never STASIS.
 */
export function evaluateSite(
  observations: Observation[],
  config: StasisConfig = STASIS_CONFIG,
  now: Date = new Date()
): SiteEvaluation {
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const usable = sorted.filter((o) => isUsable(o, config));

  const base = computeBaseline(changeSeries(usable), config);
  const audit: Audit = {
    analysisVersion: ANALYSIS_VERSION,
    thresholdsVersion: THRESHOLDS_VERSION,
    evaluatedAt: now.toISOString(),
    baseline: base,
    latestObservation: usable[usable.length - 1],
    previousObservation: usable[usable.length - 2],
    usableObservationCount: usable.length,
  };

  // --- DATA GAP guards ------------------------------------------------------
  if (usable.length < config.minValidObservations) {
    return dataGap(
      audit,
      [`Only ${usable.length} usable observation(s); need ${config.minValidObservations}.`],
      "Ground Stasis does not have enough usable imagery to evaluate recent activity yet."
    );
  }

  const latest = audit.latestObservation!;
  const daysSinceLatest = daysBetween(latest.date, now.toISOString());
  if (daysSinceLatest > config.maxDaysSinceUsableObservation) {
    return dataGap(
      audit,
      [
        `Most recent usable observation is ${Math.round(daysSinceLatest)} days old ` +
          `(> ${config.maxDaysSinceUsableObservation}).`,
      ],
      "Ground Stasis does not have enough recent usable imagery to evaluate activity. This is a data gap, not a sign of inactivity."
    );
  }

  // --- scoring --------------------------------------------------------------
  const changes = changeSeries(usable);
  const dq = dataQualityOf(usable.slice(-Math.max(config.recentWindow, 3)));
  const stasis = computeStasis(changes, base, dq, config);
  const confidence = assessConfidence(usable, base, config);

  let status = scoreToStatus(stasis.score, config);
  const reasons = statusReasons(status, stasis, base);

  // Low-confidence protection: a stasis-range score on weak evidence is capped.
  if (status === "STASIS" && confidence.level === "LOW") {
    status = config.lowConfidenceStatusCap;
    reasons.push("Stasis-range score but LOW confidence — capped to manual review.");
  }

  // A stasis candidate must also clear the minimum low-change duration.
  if (status === "STASIS" && stasis.lowChangeDurationDays < config.minDaysForStasisCandidate) {
    status = "REVIEW";
    reasons.push(
      `Low-change span (${Math.round(stasis.lowChangeDurationDays)}d) shorter than stasis minimum (${config.minDaysForStasisCandidate}d).`
    );
  }

  return {
    ...audit,
    status,
    stasis,
    confidence,
    explanation: explain(status, stasis, base),
    reasons,
  };
}
