// CAN-SPAM compliance for commercial (marketing) email: a one-click unsubscribe
// mechanism, a suppression list, and a footer carrying the unsubscribe link plus
// a valid physical postal address.
//
// Design notes:
// - Suppression is stored on the EXISTING EmailEvent audit table (reserved type
//   `marketing_unsubscribe`), so this adds NO new database model and needs no
//   migration — same primitive the digest/nurture jobs already use for dedupe.
// - Transactional email (paid alerts, magic links, $9 check result, CDI finding)
//   is NOT governed by this list. A monitoring customer who opts out of marketing
//   still receives the service alerts they pay for.

import { getPrisma } from "@/lib/db/client";
import { hasEmailEventSince } from "@/lib/reports/store";
import { createUnsubscribeToken } from "./unsubscribe-token";

export const MARKETING_UNSUBSCRIBE_TYPE = "marketing_unsubscribe";

const EPOCH = new Date(0);

/** Has this address opted out of marketing email? */
export async function isSuppressed(email: string): Promise<boolean> {
  return hasEmailEventSince(email.trim().toLowerCase(), MARKETING_UNSUBSCRIBE_TYPE, EPOCH);
}

/** Record a marketing opt-out. Idempotent in effect (isSuppressed only checks existence). */
export async function recordUnsubscribe(email: string): Promise<void> {
  const db = getPrisma();
  if (!db) return;
  await db.emailEvent.create({
    data: {
      to: email.trim().toLowerCase(),
      type: MARKETING_UNSUBSCRIBE_TYPE,
      provider: "system",
      subject: "marketing unsubscribe",
      delivered: true,
    },
  });
}

/**
 * The CAN-SPAM-required physical postal address. Read from env so it is never
 * hard-coded or faked. When unset, marketing sends are blocked (see the jobs)
 * rather than shipping a non-compliant email.
 */
export function getPostalAddress(env: NodeJS.ProcessEnv = process.env): string {
  return (env.COMPANY_POSTAL_ADDRESS ?? "").trim();
}

/** Build a signed, non-expiring unsubscribe URL for an address. */
export function buildUnsubscribeUrl(appUrl: string, email: string, secret: string): string {
  const token = createUnsubscribeToken(email, secret);
  const base = appUrl.replace(/\/+$/, "");
  return `${base}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The compliance footer appended to marketing emails. Both the unsubscribe URL
 * and the postal address are required; callers pass them in (templates stay env-free).
 */
export function renderComplianceFooterHtml(unsubscribeUrl: string, postalAddress: string): string {
  return (
    `<p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:10px 4px 0;">` +
    `You're receiving this because you used Ground Stasis. ` +
    `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a> ` +
    `from these updates. ${escapeHtml(postalAddress)}</p>`
  );
}

export function renderComplianceFooterText(unsubscribeUrl: string, postalAddress: string): string {
  return `\n\nUnsubscribe from these updates: ${unsubscribeUrl}\n${postalAddress}`;
}
