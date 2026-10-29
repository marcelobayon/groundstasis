// Data access for the reporting feature. Co-located with the feature (same
// pattern as src/lib/api/webhooks/store.ts) so the weekly-digest job doesn't
// reach into the Prisma client directly. All reads; no schema changes.

import { getPrisma } from "@/lib/db/client";

export interface DigestRecipient {
  id: string;
  email: string;
}

/**
 * Users who should receive a portfolio digest: anyone with at least one
 * monitored site. (A site only exists after a paid subscription provisions
 * seats, so this is effectively the active-monitoring customer list; the $9
 * one-off check creates a SiteCheck, not a Site, and is excluded.)
 */
export async function listDigestRecipients(): Promise<DigestRecipient[]> {
  const db = getPrisma();
  if (!db) return [];
  return db.user.findMany({
    where: { sites: { some: {} } },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Has an email of this type already gone to this address since `since`?
 * Used to make the weekly send idempotent within an ISO week, so a retried or
 * double-fired cron never double-emails a lender. Backed by the
 * EmailEvent @@index([to, createdAt]).
 */
export async function hasEmailEventSince(
  to: string,
  type: string,
  since: Date,
): Promise<boolean> {
  const db = getPrisma();
  if (!db) return false;
  const hit = await db.emailEvent.findFirst({
    where: { to, type, createdAt: { gte: since } },
    select: { id: true },
  });
  return Boolean(hit);
}
