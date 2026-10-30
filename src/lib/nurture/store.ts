// Data access for the post-check nurture flow. Reads paid SiteCheck rows via
// the Prisma client (same delegate-cast pattern the repository uses for
// SiteCheck). No schema change; read-only.

import { getPrisma } from "@/lib/db/client";

export interface NurtureCheck {
  token: string;
  email: string;
  createdAt: Date;
  siteName: string | null;
}

interface CheckRow {
  token: string;
  email: string;
  createdAt: Date;
  siteName: string | null;
}

interface SiteCheckReadDelegate {
  findMany(args: {
    where: { paid: boolean; createdAt: { gte: Date } };
    select: { token: true; email: true; createdAt: true; siteName: true };
    orderBy: { createdAt: "desc" };
    take: number;
  }): Promise<CheckRow[]>;
}

/** Paid checks created within the last `maxAgeDays`, newest first. */
export async function listPaidChecks(maxAgeDays: number): Promise<NurtureCheck[]> {
  const db = getPrisma();
  if (!db) return [];
  const createdAfter = new Date(Date.now() - maxAgeDays * 86_400_000);
  const delegate = (db as unknown as { siteCheck: SiteCheckReadDelegate }).siteCheck;
  const rows = await delegate.findMany({
    where: { paid: true, createdAt: { gte: createdAfter } },
    select: { token: true, email: true, createdAt: true, siteName: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  return rows.map((r) => ({
    token: r.token,
    email: r.email,
    createdAt: r.createdAt,
    siteName: r.siteName ?? null,
  }));
}
