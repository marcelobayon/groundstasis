import { lookup } from "node:dns/promises";
import { getWebhookEncKey } from "@/lib/env";
import { decryptSecret } from "@/lib/api/webhooks/secret-crypto";
import { buildSignatureHeader } from "@/lib/api/webhooks/sign";
import { validateWebhookUrl, isBlockedIp } from "@/lib/api/webhooks/ssrf";
import { decideOutcome } from "@/lib/api/webhooks/delivery-policy";
import { webhookStoreAvailable, claimDueDeliveries, markDelivery } from "@/lib/api/webhooks/store";

export interface DeliveryRunSummary {
  attempted: number;
  delivered: number;
  retried: number;
  failed: number;
  skipped?: string;
}

const DELIVERY_TIMEOUT_MS = 8000;

// Drains the webhook delivery outbox: claim due rows, sign + POST each with a
// short timeout, and record the outcome (delivered / retry-with-backoff / fail).
// Delivery is at-least-once — consumers dedupe on the delivery id. SSRF layer 2
// lives here: the hostname is resolved and every resolved IP re-checked against
// the private/reserved blocklist before we connect.
export async function runWebhookDeliveries(opts: { now?: Date; limit?: number } = {}): Promise<DeliveryRunSummary> {
  if (!webhookStoreAvailable()) return { attempted: 0, delivered: 0, retried: 0, failed: 0, skipped: "no database" };
  const encKey = getWebhookEncKey();
  if (!encKey) return { attempted: 0, delivered: 0, retried: 0, failed: 0, skipped: "no encryption key" };

  const now = opts.now ?? new Date();
  const due = await claimDueDeliveries(opts.limit ?? 50, now);
  let delivered = 0;
  let retried = 0;
  let failed = 0;

  for (const d of due) {
    const attemptsAfter = d.attempts + 1;
    let ok = false;
    let responseStatus: number | null = null;

    try {
      if (!d.endpoint || !d.endpoint.active) throw new Error("endpoint inactive");
      const v = validateWebhookUrl(d.endpoint.url);
      if (!v.ok) throw new Error("invalid url");

      // SSRF layer 2: resolve + re-check every address (defeats DNS rebinding /
      // public names that point at private space).
      const addrs = await lookup(v.url.hostname, { all: true });
      if (addrs.length === 0 || addrs.some((a) => isBlockedIp(a.address))) throw new Error("blocked address");

      const envelope = {
        id: d.id,
        event: d.event,
        created_at: now.toISOString(),
        data: d.payload,
      };
      const body = JSON.stringify(envelope);
      const secret = decryptSecret(d.endpoint.secretCipher, encKey);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
      try {
        const res = await fetch(v.url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "GroundStasis-Webhooks/1.0",
            "X-GroundStasis-Event": d.event,
            "X-GroundStasis-Delivery": d.id,
            "X-GroundStasis-Signature": buildSignatureHeader(secret, body, now.getTime()),
          },
          body,
          signal: controller.signal,
        });
        responseStatus = res.status;
        ok = res.ok;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      ok = false;
    }

    const outcome = decideOutcome(ok, attemptsAfter);
    if (outcome.kind === "delivered") {
      await markDelivery(d.id, { status: "delivered", attempts: attemptsAfter, responseStatus, now });
      delivered++;
    } else if (outcome.kind === "retry") {
      await markDelivery(d.id, {
        status: "pending",
        attempts: attemptsAfter,
        responseStatus,
        nextAttemptAt: new Date(now.getTime() + outcome.nextAttemptMs),
        now,
      });
      retried++;
    } else {
      await markDelivery(d.id, { status: "failed", attempts: attemptsAfter, responseStatus, now });
      failed++;
    }
  }

  return { attempted: due.length, delivered, retried, failed };
}
