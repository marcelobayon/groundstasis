import type { SiteEvaluation, SiteStatus, Observation } from "@/lib/analysis/types";
import { evaluateSite, STASIS_CONFIG, ANALYSIS_VERSION, THRESHOLDS_VERSION } from "@/lib/analysis";
import { decideAlerts, type Alert, type AlertType } from "@/lib/analysis/alerts";
import { getSatelliteProvider } from "@/lib/satellite";
import type { SatelliteProvider } from "@/lib/satellite/provider";
import type { ProviderSite, DateRange } from "@/lib/satellite/types";
import { getEmailProvider, getEmailFrom, renderAlertEmail } from "@/lib/email";
import type { SendResult } from "@/lib/email/provider";
import { createMagicLinkToken } from "@/lib/auth/magic-link";
import { getMagicLinkSecrets, getMagicLinkTtlMinutes } from "@/lib/env";

// Orchestrates one site's analysis cycle:
//   fetch observations -> quality filter + evaluate -> decide alerts -> email.
//
// IDEMPOTENT: pass the keys already emitted for the site in `alreadySentKeys`
// and a re-run will not re-send the same alert. A provider failure degrades to
// DATA_GAP and NEVER produces a stasis alert (spec §53).
//
// CHANGED vs the originally shipped file: `observations` is added to
// AnalyzeSiteResult (interface + both returns) and `Observation` is imported,
// so the caller can persist the fetched observations to the database.

export interface AnalyzeSiteInput {
  site: ProviderSite;
  siteName: string;
  loanNumber?: string;
  recipientEmail?: string;
  previousStatus: SiteStatus | null;
  alreadySentKeys?: string[];
  latestKnownObservationId?: string | null;
  range?: DateRange;
  now?: Date;
  emailObservationAvailable?: boolean;
  provider?: SatelliteProvider;
}

export interface AnalyzeSiteResult {
  observations: Observation[];
  evaluation: SiteEvaluation;
  alerts: Alert[];
  emailsSent: Array<{ type: AlertType; to: string; result: SendResult }>;
  run: {
    analysisVersion: string;
    thresholdsVersion: string;
    provider: string;
    status: "COMPLETE" | "DATA_GAP" | "FAILED";
    observationIds: string[];
    error?: string;
  };
}

const EMAILED_BY_DEFAULT: AlertType[] = ["STASIS_DETECTED", "ACTIVITY_RESUMED", "DATA_GAP"];

function buildViewUrl(siteId: string, isDemo: boolean): string {
  const base = process.env.APP_URL ?? "https://groundstasis.com";
  if (isDemo) return `${base}/demo`;
  const secrets = getMagicLinkSecrets();
  if (secrets.length > 0) {
    const token = createMagicLinkToken(siteId, secrets[0], {
      ttlMinutes: getMagicLinkTtlMinutes(),
      scope: "site:read",
    });
    return `${base}/s/${encodeURIComponent(token)}`;
  }
  return `${base}/demo`;
}

export async function analyzeSite(input: AnalyzeSiteInput): Promise<AnalyzeSiteResult> {
  const provider = input.provider ?? getSatelliteProvider();
  const now = input.now ?? new Date();

  let observations: Observation[];
  try {
    const range: DateRange =
      input.range ?? { from: "2026-01-01", to: now.toISOString().slice(0, 10) };
    observations = await provider.getAvailableObservations(input.site, range);
  } catch (err) {
    // Provider failure is a DATA GAP, never a stasis. Evaluate with no data.
    const evaluation = evaluateSite([], STASIS_CONFIG, now);
    return {
      observations: [],
      evaluation,
      alerts: [],
      emailsSent: [],
      run: {
        analysisVersion: ANALYSIS_VERSION,
        thresholdsVersion: THRESHOLDS_VERSION,
        provider: provider.name,
        status: "FAILED",
        observationIds: [],
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }

  const evaluation = evaluateSite(observations, STASIS_CONFIG, now);

  const latestId = evaluation.latestObservation?.observationId ?? null;
  const latestObservationIsNew =
    latestId != null && latestId !== (input.latestKnownObservationId ?? null);

  const alerts = decideAlerts({
    siteId: input.site.id,
    previousStatus: input.previousStatus,
    evaluation,
    alreadySent: new Set(input.alreadySentKeys ?? []),
    latestObservationIsNew,
  });

  const emailsSent: AnalyzeSiteResult["emailsSent"] = [];
  const emailable = new Set<AlertType>(
    input.emailObservationAvailable
      ? [...EMAILED_BY_DEFAULT, "OBSERVATION_AVAILABLE"]
      : EMAILED_BY_DEFAULT
  );

  if (input.recipientEmail) {
    const emailProvider = getEmailProvider();
    const viewUrl = buildViewUrl(input.site.id, provider.isDemo);
    for (const alert of alerts) {
      if (!emailable.has(alert.type)) continue;
      const rendered = renderAlertEmail(alert.type, {
        siteName: input.siteName,
        loanNumber: input.loanNumber,
        evaluation,
        viewUrl,
      });
      const result = await emailProvider.send({
        to: input.recipientEmail,
        from: getEmailFrom(),
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        tags: { alertType: alert.type, siteId: input.site.id },
      });
      emailsSent.push({ type: alert.type, to: input.recipientEmail, result });
    }
  }

  return {
    observations,
    evaluation,
    alerts,
    emailsSent,
    run: {
      analysisVersion: ANALYSIS_VERSION,
      thresholdsVersion: THRESHOLDS_VERSION,
      provider: provider.name,
      status: evaluation.status === "DATA_GAP" ? "DATA_GAP" : "COMPLETE",
      observationIds: observations.map((o) => o.observationId),
    },
  };
}
