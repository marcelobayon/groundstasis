import { getSiteRepository } from "@/lib/db/repository";
import { getEmailProvider, getEmailFrom, renderCdiFinding } from "@/lib/email";
import { createMagicLinkToken } from "@/lib/auth/magic-link";
import { getMagicLinkSecrets } from "@/lib/env";
import type { CdiFinding } from "./findings";

// Shared Construction Draw Intelligence delivery: build the secure workspace
// link and email a finding — but only when the finding CODE has changed, so a
// quiet site doesn't email the same thing every monitoring cycle.

type Repo = NonNullable<ReturnType<typeof getSiteRepository>>;

/** A long-lived, site-scoped magic link to the CDI workspace for one site. */
export function buildWorkspaceUrl(siteId: string): string {
  const base = process.env.APP_URL ?? "https://groundstasis.com";
  const secrets = getMagicLinkSecrets();
  if (secrets.length === 0) return `${base}/`;
  const token = createMagicLinkToken(siteId, secrets[0], {
    ttlMinutes: 60 * 24 * 30,
    scope: "site:workspace",
  });
  return `${base}/site/${encodeURIComponent(token)}`;
}

export async function deliverCdiFinding(args: {
  repo: Repo;
  siteId: string;
  siteName: string;
  recipientEmail: string | null;
  finding: CdiFinding;
  previousCode: string | null;
}): Promise<{ emailed: boolean }> {
  const { repo, siteId, siteName, recipientEmail, finding, previousCode } = args;

  // Always persist the latest finding for the workspace view + idempotency.
  await repo.saveCdiFinding(siteId, { code: finding.code, json: finding });

  if (!recipientEmail || finding.code === previousCode) return { emailed: false };

  const workspaceUrl = buildWorkspaceUrl(siteId);
  const rendered = renderCdiFinding({ siteName, finding, workspaceUrl });
  const provider = getEmailProvider();
  const res = await provider.send({
    to: recipientEmail,
    from: getEmailFrom(),
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    tags: { cdiFinding: finding.code, siteId },
  });
  await repo.recordEmailEvent({
    to: recipientEmail,
    type: "cdi_finding",
    provider: provider.name,
    providerId: res.id,
    subject: rendered.subject,
    delivered: res.delivered,
  });
  return { emailed: true };
}
