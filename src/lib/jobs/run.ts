import { analyzeSite } from "./analyze-site";
import { runDemoAnalysis } from "./demo";
import { getSiteRepository } from "@/lib/db/repository";
import type { GeoJSONPolygon } from "@/lib/geo/types";
import { compareMilestoneToEvidence, type MilestoneStage } from "@/lib/cdi/findings";
import { deliverCdiFinding } from "@/lib/cdi/deliver";
import { emitAlertWebhooks } from "@/lib/api/webhooks/emit";

// The scheduled-analysis orchestrator. When a database is configured it iterates
// the sites due for analysis, runs each through the (idempotent) job, and
// persists the result. With no database it runs the demo site so the endpoint
// stays exercisable with zero configuration.

export interface RunSummary {
  mode: "db" | "demo";
  sites: number;
  results: Array<{ siteId?: string; status: string; score: number; alerts: string[] }>;
}

export async function runScheduledAnalysis(now: Date = new Date()): Promise<RunSummary> {
  const repo = getSiteRepository();

  if (!repo) {
    const r = await runDemoAnalysis({});
    return {
      mode: "demo",
      sites: 1,
      results: [
        { status: r.evaluation.status, score: r.evaluation.stasis.score, alerts: r.alerts.map((a) => a.type) },
      ],
    };
  }

  const sites = await repo.getSitesDueForAnalysis();
  const results: RunSummary["results"] = [];

  for (const site of sites) {
    const ctx = await repo.getSiteContext(site.id);
    const result = await analyzeSite({
      site: { id: site.id, name: site.name, geometry: site.geometryGeojson as GeoJSONPolygon },
      siteName: site.name,
      loanNumber: site.loanNumber ?? undefined,
      recipientEmail: ctx.recipientEmail ?? undefined,
      previousStatus: ctx.previousStatus,
      alreadySentKeys: ctx.alreadySentKeys,
      latestKnownObservationId: ctx.latestKnownObservationId,
      range: site.constructionStart
        ? { from: site.constructionStart.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
        : undefined,
      now,
    });

    const persisted = await repo.persistAnalysis(site.id, {
      observations: result.observations,
      evaluation: result.evaluation,
      alerts: result.alerts,
      run: result.run,
    });

    // Webhook emission — best-effort; a failure here must never break the run.
    try {
      await emitAlertWebhooks({
        userId: site.userId,
        siteId: site.id,
        siteName: site.name,
        status: result.evaluation.status,
        insertedAlerts: persisted.insertedAlerts,
      });
    } catch {
      // deliveries live in the outbox and retry on the next scheduled tick
    }

    // Construction Draw Intelligence: compare the reported milestone against the
    // fresh evaluation and email the finding when it changes.
    if (ctx.drawIntelligence && ctx.milestone) {
      const finding = compareMilestoneToEvidence(
        {
          reportedStage: ctx.milestone.reportedStage as MilestoneStage,
          expectedMilestone: ctx.milestone.expectedMilestone,
          targetDate: ctx.milestone.targetDate,
          actualStageReported: ctx.milestone.actualStageReported,
        },
        result.evaluation,
        { now, recentlyResumed: result.alerts.some((a) => a.type === "ACTIVITY_RESUMED") }
      );
      await deliverCdiFinding({
        repo,
        siteId: site.id,
        siteName: site.name,
        recipientEmail: ctx.recipientEmail,
        finding,
        previousCode: ctx.milestone.lastFindingCode,
      });
    }

    results.push({
      siteId: site.id,
      status: result.evaluation.status,
      score: result.evaluation.stasis.score,
      alerts: result.alerts.map((a) => a.type),
    });
  }

  return { mode: "db", sites: sites.length, results };
}
