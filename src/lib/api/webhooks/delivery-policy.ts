// Retry policy for webhook delivery. PURE so the backoff + terminal-state logic
// is unit-tested without a database or network.

export const MAX_ATTEMPTS = 6;

// Exponential backoff keyed on attempts already made: 30s, 1m, 2m, 4m, 8m …
// capped at 6 hours.
export function backoffMs(attemptsAfter: number): number {
  const base = 30_000;
  const n = Math.max(1, attemptsAfter);
  return Math.min(base * 2 ** (n - 1), 6 * 60 * 60_000);
}

export type DeliveryOutcome =
  | { kind: "delivered" }
  | { kind: "retry"; nextAttemptMs: number }
  | { kind: "failed" };

export function decideOutcome(ok: boolean, attemptsAfter: number): DeliveryOutcome {
  if (ok) return { kind: "delivered" };
  if (attemptsAfter >= MAX_ATTEMPTS) return { kind: "failed" };
  return { kind: "retry", nextAttemptMs: backoffMs(attemptsAfter) };
}
