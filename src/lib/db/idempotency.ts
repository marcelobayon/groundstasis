import type { Alert } from "@/lib/analysis/alerts";

// Idempotent alert insertion, extracted as a pure helper so it is testable
// without a database. The unique constraint on SiteAlert.idempotencyKey is the
// backstop: a job that runs twice tries to insert the same alert, the DB raises
// P2002, and we treat that as "already sent" rather than an error.

/** True for a Prisma unique-constraint violation (duplicate idempotencyKey). */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

export async function insertAlertsIdempotently(
  alerts: Alert[],
  createFn: (a: Alert) => Promise<void>
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  for (const a of alerts) {
    try {
      await createFn(a);
      inserted++;
    } catch (e) {
      if (isUniqueViolation(e)) skipped++;
      else throw e;
    }
  }
  return { inserted, skipped };
}
