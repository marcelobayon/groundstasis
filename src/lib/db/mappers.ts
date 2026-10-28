import {
  Prisma,
  SiteStatus as DbSiteStatus,
  Confidence as DbConfidence,
  QualityStatus as DbQuality,
  AlertType as DbAlertType,
  AlertSeverity as DbSeverity,
  SubscriptionState as DbSubscriptionState,
} from "@prisma/client";
import type {
  Observation,
  SiteEvaluation,
  SiteStatus,
  ConfidenceLevel,
  QualityStatus,
} from "@/lib/analysis/types";
import type { Alert } from "@/lib/analysis/alerts";

// Translate between the pure domain types (the analysis engine's vocabulary)
// and Prisma's generated input types. Typed against the generated client, so
// `tsc` fails here if a field name or enum drifts from the schema.

export function toDate(iso: string): Date {
  return new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
}

export function toDbStatus(s: SiteStatus): DbSiteStatus {
  return DbSiteStatus[s];
}

/** DB status may be PAUSED (no domain equivalent); map that to null. */
export function fromDbStatus(s: DbSiteStatus): SiteStatus | null {
  return s === DbSiteStatus.PAUSED ? null : (s as unknown as SiteStatus);
}

export function toDbConfidence(level: string): DbConfidence {
  const key = level as keyof typeof DbConfidence;
  return DbConfidence[key] ?? DbConfidence.LOW;
}

export function toDbQuality(q: QualityStatus): DbQuality {
  return DbQuality[q];
}

export function toDbSubscriptionState(s: string): DbSubscriptionState {
  const key = s as keyof typeof DbSubscriptionState;
  return DbSubscriptionState[key] ?? DbSubscriptionState.unknown;
}

export function observationUpsert(siteId: string, o: Observation): Prisma.SiteObservationUpsertArgs {
  const metric: Prisma.SiteMetricCreateWithoutObservationInput = {
    meanNdvi: o.ndvi.mean,
    medianNdvi: o.ndvi.median,
    meanNdbi: o.ndbi.mean,
    medianNdbi: o.ndbi.median,
    meanBsi: o.bsi.mean,
    medianBsi: o.bsi.median,
  };
  return {
    where: {
      siteId_provider_providerObservationId: {
        siteId,
        provider: o.provider,
        providerObservationId: o.observationId,
      },
    },
    create: {
      site: { connect: { id: siteId } },
      provider: o.provider,
      providerObservationId: o.observationId,
      observationDate: toDate(o.date),
      cloudPercent: o.cloudPercent,
      usablePixelPercent: o.validPixelPercent,
      qualityStatus: toDbQuality(o.qualityStatus),
      metrics: { create: metric },
    },
    update: {
      cloudPercent: o.cloudPercent,
      usablePixelPercent: o.validPixelPercent,
      qualityStatus: toDbQuality(o.qualityStatus),
    },
  };
}

export function siteUpdateFromEvaluation(ev: SiteEvaluation): Prisma.SiteUpdateInput {
  return {
    status: toDbStatus(ev.status),
    stasisScore: ev.stasis.score,
    confidence: toDbConfidence(ev.confidence.level),
    analysisVersion: ev.analysisVersion,
    thresholdsVersion: ev.thresholdsVersion,
    lastEvaluatedAt: toDate(ev.evaluatedAt),
  };
}

export function alertCreate(siteId: string, a: Alert): Prisma.SiteAlertCreateInput {
  return {
    site: { connect: { id: siteId } },
    type: DbAlertType[a.type],
    severity: DbSeverity[a.severity],
    score: a.score,
    confidence: toDbConfidence(a.confidence),
    idempotencyKey: a.idempotencyKey,
    observationId: a.observationId ?? null,
    analysisVersion: a.analysisVersion,
    thresholdsVersion: a.thresholdsVersion,
    triggeredAt: toDate(a.triggeredAt),
  };
}

export interface AnalysisRunData {
  analysisVersion: string;
  thresholdsVersion: string;
  provider: string;
  status: string;
  observationIds: string[];
  error?: string;
}

export function analysisRunCreate(
  siteId: string,
  run: AnalysisRunData,
  ev: SiteEvaluation
): Prisma.AnalysisRunCreateInput {
  return {
    site: { connect: { id: siteId } },
    analysisVersion: run.analysisVersion,
    thresholdsVersion: run.thresholdsVersion,
    provider: run.provider,
    status: run.status,
    observationIds: run.observationIds,
    resultStatus: toDbStatus(ev.status),
    resultScore: ev.stasis.score,
    resultConfidence: toDbConfidence(ev.confidence.level),
    error: run.error ?? null,
    finishedAt: new Date(),
  };
}
