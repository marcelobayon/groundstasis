// Usage metering + rate limiting for API v1.
//
// Rate limiting is counted from the usage ledger (no new infra): the number of
// metered requests for a key in the trailing window. This is durable across
// Netlify's ephemeral invocations. At higher volume, move the counter to Redis;
// for the developer tier the ledger count is sufficient. Note: the limit is
// checked before the current request is recorded, so a small burst can slip
// through — acceptable for a free/developer tier, documented in the API docs.

import { recordUsage, countUsageSince, type UsageRecordCreateData } from "./store";

const WINDOW_MS = 60_000;
export const DEFAULT_PER_MINUTE = 60;
export const PRICE_VERSION = "v1-free";

export async function checkRateLimit(
  apiKeyId: string,
  limitPerMinute: number = DEFAULT_PER_MINUTE
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const since = new Date(Date.now() - WINDOW_MS);
  const used = await countUsageSince(apiKeyId, since);
  return { allowed: used < limitPerMinute, remaining: Math.max(0, limitPerMinute - used), limit: limitPerMinute };
}

export async function meter(input: {
  userId: string;
  apiKeyId: string;
  operation: string;
  outcome: string;
  route?: string;
  status?: number;
  billableUnits?: number;
  idempotencyKey?: string;
}): Promise<void> {
  const data: UsageRecordCreateData = {
    userId: input.userId,
    apiKeyId: input.apiKeyId,
    operation: input.operation,
    outcome: input.outcome,
    route: input.route ?? null,
    status: input.status ?? null,
    billableUnits: input.billableUnits ?? 0,
    idempotencyKey: input.idempotencyKey ?? null,
    priceVersion: PRICE_VERSION,
  };
  // Metering must never break the request it is recording.
  await recordUsage(data).catch(() => {});
}
