import type { SiteEvaluation, SiteStatus, ConfidenceLevel } from "@/lib/analysis/types";

// Construction Draw Intelligence — the reported-vs-observed comparison.
//
// GOVERNING RULES (mirror the product's compliance posture):
//  - A customer-REPORTED milestone is never treated as fact the satellite can
//    certify. We only ever say what the imagery *observed* vs what was *reported*.
//  - We never invent a completion % or a numeric confidence. Confidence is the
//    engine's existing HIGH/MEDIUM/LOW, carried through unchanged.
//  - Many real milestones (interior MEP, inspections, finishes) are NOT visible
//    from 10 m imagery. For those we say "not independently verifiable" rather
//    than inferring a stall from low observable change.
//  - A finding is produced ONLY when the actual evaluation + these rules support
//    it. No data → INSUFFICIENT_DATA, never a discrepancy.

export type MilestoneStage =
  | "SITE_PREP"
  | "EXCAVATION"
  | "FOUNDATION"
  | "STRUCTURAL_FRAMING"
  | "BUILDING_ENCLOSURE"
  | "EXTERIOR_COMPLETION"
  | "OTHER"
  | "UNKNOWN";

export type CdiFindingCode =
  | "ACTIVITY_CONSISTENT"
  | "REDUCED_ACTIVITY"
  | "ACTIVITY_RESUMED"
  | "NOT_VERIFIABLE"
  | "INSUFFICIENT_DATA"
  | "POTENTIAL_DISCREPANCY";

export const MILESTONE_STAGES: { value: MilestoneStage; label: string }[] = [
  { value: "SITE_PREP", label: "Site preparation" },
  { value: "EXCAVATION", label: "Excavation & earthworks" },
  { value: "FOUNDATION", label: "Foundation" },
  { value: "STRUCTURAL_FRAMING", label: "Structural framing" },
  { value: "BUILDING_ENCLOSURE", label: "Building enclosure" },
  { value: "EXTERIOR_COMPLETION", label: "Exterior completion" },
  { value: "OTHER", label: "Other / custom milestone" },
  { value: "UNKNOWN", label: "Unknown" },
];

export function stageLabel(stage: string): string {
  return MILESTONE_STAGES.find((s) => s.value === stage)?.label ?? "Unknown";
}

export const CDI_LIMITATIONS =
  "Ground Stasis analyzes observable changes in satellite imagery. It cannot independently verify construction quality, completed-work value, code compliance, contractor performance, invoices, or whether a draw should be released. Cloud cover, image resolution, revisit frequency, and site conditions limit observations. An alert or a lack of detected activity is not proof that construction has stopped, resumed, or met a milestone. Use this as supplemental information alongside inspections, project documentation, and professional judgment.";

/** Stages where we'd EXPECT visible exterior change. Interior/finish/unknown
 *  stages are not reliably observable from 10 m imagery, so low change there is
 *  expected, not a stall. */
function exteriorActivityExpected(stage: MilestoneStage): boolean {
  switch (stage) {
    case "SITE_PREP":
    case "EXCAVATION":
    case "FOUNDATION":
    case "STRUCTURAL_FRAMING":
    case "BUILDING_ENCLOSURE":
      return true;
    // Exterior shell complete → remaining work is largely interior; OTHER /
    // UNKNOWN can't be assumed visible.
    case "EXTERIOR_COMPLETION":
    case "OTHER":
    case "UNKNOWN":
    default:
      return false;
  }
}

export interface MilestoneContext {
  reportedStage: MilestoneStage;
  expectedMilestone?: string | null;
  targetDate?: Date | null;
  actualStageReported?: string | null;
}

export interface CdiFinding {
  code: CdiFindingCode;
  title: string;
  summary: string;
  action: string;
  /** engine confidence carried through; null when there isn't enough data */
  confidence: ConfidenceLevel | null;
  observed: {
    status: SiteStatus;
    latestObservationDate: string | null;
    usableObservationCount: number;
  };
  reported: {
    stage: MilestoneStage;
    expectedMilestone: string | null;
    targetDate: string | null;
    actualStageReported: string | null;
  };
  limitations: string;
}

const TITLE: Record<CdiFindingCode, string> = {
  ACTIVITY_CONSISTENT: "Activity appears consistent with expected site work",
  REDUCED_ACTIVITY: "Reduced observable activity — review may be warranted",
  ACTIVITY_RESUMED: "Observable activity appears to have resumed",
  NOT_VERIFIABLE: "Milestone not independently verifiable from available observations",
  INSUFFICIENT_DATA: "Insufficient or outdated observations",
  POTENTIAL_DISCREPANCY: "Potential discrepancy between reported stage and observed activity",
};

const ACTION: Record<CdiFindingCode, string> = {
  ACTIVITY_CONSISTENT:
    "No additional action is prompted by the current evidence. Ground Stasis will recheck as new usable observations arrive.",
  REDUCED_ACTIVITY:
    "Consider requesting updated site photographs or contractor progress documentation, and compare the reported milestone against the project schedule.",
  ACTIVITY_RESUMED:
    "Note the renewed activity and confirm it against borrower reporting before relying on it. It does not, on its own, confirm the reported milestone.",
  NOT_VERIFIABLE:
    "This stage is largely interior or otherwise not visible from satellite imagery. Rely on inspection and contractor documentation to confirm this milestone.",
  INSUFFICIENT_DATA:
    "There isn't enough recent usable imagery to compare against the reported milestone. Recheck when new observations become available.",
  POTENTIAL_DISCREPANCY:
    "The reported stage or schedule and the observed activity may not align. Consider requesting updated photos, contractor documentation, or an independent site inspection.",
};

function iso(d?: string): string | null {
  return d ?? null;
}

export function compareMilestoneToEvidence(
  ctx: MilestoneContext,
  evaluation: SiteEvaluation,
  opts: { now?: Date; recentlyResumed?: boolean } = {}
): CdiFinding {
  const now = opts.now ?? new Date();
  const observed = {
    status: evaluation.status,
    latestObservationDate: iso(evaluation.latestObservation?.date),
    usableObservationCount: evaluation.usableObservationCount,
  };
  const reported = {
    stage: ctx.reportedStage,
    expectedMilestone: ctx.expectedMilestone ?? null,
    targetDate: ctx.targetDate ? ctx.targetDate.toISOString().slice(0, 10) : null,
    actualStageReported: ctx.actualStageReported ?? null,
  };

  const build = (code: CdiFindingCode, summary: string, confidence: ConfidenceLevel | null): CdiFinding => ({
    code,
    title: TITLE[code],
    summary,
    action: ACTION[code],
    confidence,
    observed,
    reported,
    limitations: CDI_LIMITATIONS,
  });

  // 1. No usable data → never infer anything.
  if (evaluation.status === "DATA_GAP" || evaluation.usableObservationCount < 3) {
    return build(
      "INSUFFICIENT_DATA",
      "There isn't enough recent usable satellite imagery to compare against the reported milestone.",
      null
    );
  }

  const conf = evaluation.confidence.level;

  // 2. Stage not reliably observable from satellite → don't infer a stall.
  if (!exteriorActivityExpected(ctx.reportedStage)) {
    return build(
      "NOT_VERIFIABLE",
      `The reported stage is one where meaningful change is often not visible from satellite imagery, so the observations can't independently confirm or contradict it.`,
      conf
    );
  }

  // 3. Observable stage expected — compare observed activity.
  if (opts.recentlyResumed && evaluation.status === "ACTIVE") {
    return build(
      "ACTIVITY_RESUMED",
      "After a quieter period, recent observations show renewed site-level change for a stage where exterior work would be expected.",
      conf
    );
  }

  if (evaluation.status === "ACTIVE") {
    return build(
      "ACTIVITY_CONSISTENT",
      "Recent observations show site-level change consistent with the kind of exterior work expected at the reported stage.",
      conf
    );
  }

  if (evaluation.status === "WATCH" || evaluation.status === "REVIEW") {
    return build(
      "REDUCED_ACTIVITY",
      "Observed change has eased relative to this site's baseline for a stage where exterior work would be expected.",
      conf
    );
  }

  // status === STASIS
  const targetPassed = Boolean(ctx.targetDate && now.getTime() > ctx.targetDate.getTime());
  if (targetPassed) {
    return build(
      "POTENTIAL_DISCREPANCY",
      "The reported target date has passed and the stage would normally involve visible exterior work, yet observations show an unusually quiet period relative to this site's baseline.",
      conf
    );
  }
  return build(
    "REDUCED_ACTIVITY",
    "Observations show an unusually quiet period relative to this site's baseline for a stage where exterior work would be expected.",
    conf
  );
}
