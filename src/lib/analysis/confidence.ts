import type { Observation, ConfidenceAssessment, Baseline } from "./types";
import { STASIS_CONFIG, type StasisConfig } from "./config";
import { clamp } from "./statistics";

/**
 * Assess how much we should trust a determination. Confidence rises with more
 * usable observations, cleaner observations (high usable-pixel %, low cloud),
 * and an established baseline.
 *
 * Confidence is deliberately SEPARATE from the stasis score: a strong score on
 * weak evidence must never trigger the strongest alert (enforced in status.ts).
 * This is the single most important false-positive protection in the product.
 */
export function assessConfidence(
  usableObservations: Observation[],
  baseline: Baseline,
  config: StasisConfig = STASIS_CONFIG
): ConfidenceAssessment {
  const reasons: string[] = [];
  const n = usableObservations.length;

  // 1. Evidence volume
  const volume = clamp(n / config.confidence.fullEvidenceObservations, 0, 1);
  if (n < config.minValidObservations) reasons.push("Few usable observations");

  // 2. Observation cleanliness (usable-pixel fraction, with a cloud penalty)
  const cleanliness =
    n === 0
      ? 0
      : clamp(
          usableObservations.reduce((acc, o) => {
            const usable = clamp(o.validPixelPercent / 100, 0, 1);
            const cloud = clamp(o.cloudPercent / 100, 0, 1);
            return acc + clamp(usable - 0.5 * cloud, 0, 1);
          }, 0) / n,
          0,
          1
        );
  if (cleanliness < 0.6) reasons.push("Observations partially obscured by cloud/shadow");

  // 3. Baseline established
  const baselineScore = baseline.established ? 1 : 0.3;
  if (!baseline.established) reasons.push("Baseline not yet established");

  const score = clamp(0.4 * volume + 0.4 * cleanliness + 0.2 * baselineScore, 0, 1);

  let level: ConfidenceAssessment["level"];
  if (score >= config.confidence.highScore) level = "HIGH";
  else if (score >= config.confidence.mediumScore) level = "MEDIUM";
  else level = "LOW";

  if (reasons.length === 0) {
    reasons.push("Sufficient clean observations and an established baseline");
  }
  return { level, score, reasons };
}
