// Weekly digest job — the engine behind the Monday portfolio email.
//
// For each monitoring customer (a user with >=1 site), build the portfolio
// rollup and email it, unless one already went out this ISO week (idempotent
// on the EmailEvent audit row, so a retried/double-fired cron never
// double-emails). Mirrors the structure of deliver-webhooks.ts: the cron route
// is a thin admin-gated trigger; the real work lives here and is unit-testable.
//
// No new database models. Reads sites via the repository, dedupes + lists
// recipients via src/lib/reports/store.ts, sends via the configured email
// provider, and records an EmailEvent of type "weekly_digest".

import { getSiteRepository } from "@/lib/db/repository";
import { getEmailProvider, getEmailFrom } from "@/lib/email";
import { renderWeeklyDigest } from "@/lib/email/digest-template";
import { summarizePortfolio } from "@/lib/reports/portfolio";
import { listDigestRecipients, hasEmailEventSince } from "@/lib/reports/store";

export const DIGEST_EMAIL_TYPE = "weekly_digest";

export interface DigestRunSummary {
  recipientsConsidered: number;
  digestsSent: number;
  skippedAlreadySent: number;
  skippedNoSites: number;
  failed: number;
}

/** Monday 00:00 UTC of the week containing `now` — the dedupe window start. */
export function startOfIsoWeekUtc(now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const mondayIndex = (d.getUTCDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  d.setUTCDate(d.getUTCDate() - mondayIndex);
  return d;
}

function weekLabel(now: Date): string {
  return `week of ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(now)}`;
}

export async function runWeeklyDigests(now: Date = new Date()): Promise<DigestRunSummary> {
  const summary: DigestRunSummary = {
    recipientsConsidered: 0,
    digestsSent: 0,
    skippedAlreadySent: 0,
    skippedNoSites: 0,
    failed: 0,
  };

  const repo = getSiteRepository();
  if (!repo) return summary; // DB not configured — nothing to do.

  const recipients = await listDigestRecipients();
  summary.recipientsConsidered = recipients.length;

  const weekStart = startOfIsoWeekUtc(now);
  const periodLabel = weekLabel(now);
  const appUrl = process.env.APP_URL ?? "https://groundstasis.com";
  const accountUrl = `${appUrl}/account`;
  const provider = getEmailProvider();
  const from = getEmailFrom();

  for (const user of recipients) {
    try {
      if (await hasEmailEventSince(user.email, DIGEST_EMAIL_TYPE, weekStart)) {
        summary.skippedAlreadySent++;
        continue;
      }

      const sites = await repo.getSitesForUser(user.id);
      if (sites.length === 0) {
        summary.skippedNoSites++;
        continue;
      }

      const portfolio = summarizePortfolio(sites, now);
      const rendered = renderWeeklyDigest({ portfolio, accountUrl, periodLabel });

      const res = await provider.send({
        to: user.email,
        from,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        tags: { type: DIGEST_EMAIL_TYPE },
      });

      await repo.recordEmailEvent({
        to: user.email,
        type: DIGEST_EMAIL_TYPE,
        provider: res.provider,
        providerId: res.id,
        subject: rendered.subject,
        delivered: res.delivered,
      });

      summary.digestsSent++;
    } catch {
      // One recipient's failure must not stop the rest of the run.
      summary.failed++;
    }
  }

  return summary;
}
