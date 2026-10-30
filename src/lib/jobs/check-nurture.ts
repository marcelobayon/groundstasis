// Post-check nurture job. For each email with a recent paid $9 check, send a
// short honest sequence: email 1 (~day 2) frames the between-inspection risk;
// email 2 (~day 5) offers continuous monitoring. Idempotent per email + stage
// via EmailEvent, so a retried/daily cron never double-sends. Mirrors the
// weekly-digest job structure. No schema change.

import { getSiteRepository } from "@/lib/db/repository";
import { getEmailProvider, getEmailFrom } from "@/lib/email";
import { renderCheckNurture1, renderCheckNurture2 } from "@/lib/nurture/templates";
import { listPaidChecks, type NurtureCheck } from "@/lib/nurture/store";
import { hasEmailEventSince } from "@/lib/reports/store";

const T1 = "check_nurture_1";
const T2 = "check_nurture_2";
const EPOCH = new Date(0); // "ever sent?" sentinel for hasEmailEventSince
const LOOKBACK_DAYS = 21;

export interface NurtureRunSummary {
  considered: number;
  sent1: number;
  sent2: number;
  skipped: number;
  failed: number;
}

export async function runCheckNurture(now: Date = new Date()): Promise<NurtureRunSummary> {
  const summary: NurtureRunSummary = { considered: 0, sent1: 0, sent2: 0, skipped: 0, failed: 0 };

  const repo = getSiteRepository();
  if (!repo) return summary;

  const checks = await listPaidChecks(LOOKBACK_DAYS);
  // Dedupe to the most recent paid check per email (listPaidChecks is newest-first).
  const byEmail = new Map<string, NurtureCheck>();
  for (const c of checks) {
    if (c.email && !byEmail.has(c.email)) byEmail.set(c.email, c);
  }
  summary.considered = byEmail.size;

  const appUrl = process.env.APP_URL ?? "https://groundstasis.com";
  const monitoringUrl = `${appUrl}/construction-loan-monitoring`;
  const gapCalcUrl = `${appUrl}/construction-monitoring-gap-calculator`;
  const provider = getEmailProvider();
  const from = getEmailFrom();

  for (const c of byEmail.values()) {
    try {
      const ageDays = (now.getTime() - c.createdAt.getTime()) / 86_400_000;
      const sent1 = await hasEmailEventSince(c.email, T1, EPOCH);
      const sent2 = await hasEmailEventSince(c.email, T2, EPOCH);

      const ctx = {
        siteName: c.siteName,
        checkUrl: `${appUrl}/check/${c.token}`,
        monitoringUrl,
        gapCalcUrl,
      };

      let type: string | null = null;
      let rendered = null as ReturnType<typeof renderCheckNurture1> | null;
      if (!sent1 && ageDays >= 2) {
        rendered = renderCheckNurture1(ctx);
        type = T1;
      } else if (sent1 && !sent2 && ageDays >= 5) {
        rendered = renderCheckNurture2(ctx);
        type = T2;
      }

      if (!rendered || !type) {
        summary.skipped++;
        continue;
      }

      const res = await provider.send({
        to: c.email,
        from,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        tags: { type },
      });
      await repo.recordEmailEvent({
        to: c.email,
        type,
        provider: res.provider,
        providerId: res.id,
        subject: rendered.subject,
        delivered: res.delivered,
      });
      if (type === T1) summary.sent1++;
      else summary.sent2++;
    } catch {
      summary.failed++;
    }
  }

  return summary;
}
