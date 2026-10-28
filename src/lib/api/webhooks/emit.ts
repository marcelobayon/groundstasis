import type { Alert } from "@/lib/analysis/alerts";
import { alertTypeToEvent, type WebhookEvent } from "./events";
import { listActiveEndpoints, enqueueDelivery } from "./store";

// Turns newly-inserted monitoring alerts into queued webhook deliveries. Called
// from the analysis job AFTER persistence, and only ever best-effort — the
// caller wraps it so a webhook failure can never break an analysis run. Only
// alerts that were actually inserted are passed in (duplicates are filtered by
// idempotency upstream), so this never double-emits on a re-run.
export async function emitAlertWebhooks(input: {
  userId: string;
  siteId: string;
  siteName: string;
  status: string;
  insertedAlerts: Alert[];
}): Promise<void> {
  if (input.insertedAlerts.length === 0) return;
  const active = await listActiveEndpoints(input.userId);
  if (active.length === 0) return;

  for (const alert of input.insertedAlerts) {
    const event = alertTypeToEvent(alert.type);
    if (!event) continue;

    const payload = {
      site_id: input.siteId,
      site_name: input.siteName,
      status: input.status,
      stasis_score: alert.score,
      confidence: alert.confidence,
      observed_at: alert.triggeredAt,
    };

    // A stasis/resumed alert is also a status transition, so endpoints that
    // subscribed to the generic status-changed stream hear about it too.
    const events: WebhookEvent[] =
      event === "stasis.detected" || event === "activity.resumed" ? [event, "site.status_changed"] : [event];

    for (const ev of events) {
      for (const ep of active) {
        if (ep.events.includes(ev)) {
          await enqueueDelivery({ endpointId: ep.id, event: ev, payload });
        }
      }
    }
  }
}
