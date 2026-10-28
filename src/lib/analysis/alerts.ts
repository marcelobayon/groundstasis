import type { SiteEvaluation, SiteStatus } from "./types";
import { ANALYSIS_VERSION, THRESHOLDS_VERSION } from "./config";

// Alert decisions are derived PURELY from a state transition plus the current
// evaluation. They are idempotent: the same triggering state never yields two
// alerts (see `idempotencyKey` + `alreadySent`). This is what prevents a job
// that runs twice from double-emailing a lender.

export type AlertType =
  | "STASIS_DETECTED"
  | "ACTIVITY_RESUMED"
  | "DATA_GAP"
  | "OBSERVATION_AVAILABLE";

export type AlertSeverity = "INFO" | "NOTICE" | "WARNING";

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  siteId: string;
  score: number;
  confidence: string;
  /** idempotency key — the same triggering state never produces two alerts */
  idempotencyKey: string;
  triggeredAt: string;
  observationId?: string;
  analysisVersion: string;
  thresholdsVersion: string;
}

export interface AlertDecisionInput {
  siteId: string;
  previousStatus: SiteStatus | null;
  evaluation: SiteEvaluation;
  /** idempotency keys already emitted for this site */
  alreadySent?: Set<string>;
  /** whether the latest observation is newly processed */
  latestObservationIsNew?: boolean;
}

export function decideAlerts(input: AlertDecisionInput): Alert[] {
  const { siteId, previousStatus: prev, evaluation } = input;
  const sent = input.alreadySent ?? new Set<string>();
  const out: Alert[] = [];
  const obsId = evaluation.latestObservation?.observationId;
  const triggeredAt = evaluation.evaluatedAt;
  const now = evaluation.status;

  const push = (type: AlertType, severity: AlertSeverity, keyPart: string) => {
    const idempotencyKey = `${siteId}:${type}:${keyPart}`;
    if (sent.has(idempotencyKey)) return;
    sent.add(idempotencyKey);
    out.push({
      type,
      severity,
      siteId,
      score: evaluation.stasis.score,
      confidence: evaluation.confidence.level,
      idempotencyKey,
      triggeredAt,
      observationId: obsId,
      analysisVersion: ANALYSIS_VERSION,
      thresholdsVersion: THRESHOLDS_VERSION,
    });
  };

  const keyBase = obsId ?? triggeredAt;

  // STASIS DETECTED — entering STASIS from any non-stasis state.
  if (now === "STASIS" && prev !== "STASIS") {
    push("STASIS_DETECTED", "WARNING", keyBase);
  }

  // ACTIVITY RESUMED — leaving a stasis/review state back into activity.
  if ((prev === "STASIS" || prev === "REVIEW") && (now === "ACTIVE" || now === "WATCH")) {
    push("ACTIVITY_RESUMED", "NOTICE", keyBase);
  }

  // DATA GAP — entering a data gap (never confuse "no data" with "no activity").
  if (now === "DATA_GAP" && prev !== "DATA_GAP") {
    push("DATA_GAP", "NOTICE", `gap:${keyBase}`);
  }

  // OBSERVATION AVAILABLE — a new usable observation, informational only.
  if (input.latestObservationIsNew && obsId && now !== "DATA_GAP") {
    push("OBSERVATION_AVAILABLE", "INFO", obsId);
  }

  return out;
}
