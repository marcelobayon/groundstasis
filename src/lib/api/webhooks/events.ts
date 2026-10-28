// Webhook event catalog. Events mirror the monitoring domain's existing alert
// types (AlertType in schema.prisma) plus a status-change event, so webhooks
// expose what the system already produces rather than inventing new concepts.
// PURE — no Prisma/Next imports.

export type WebhookEvent =
  | "stasis.detected"
  | "activity.resumed"
  | "data_gap.detected"
  | "observation.available"
  | "site.status_changed";

export const WEBHOOK_EVENTS: readonly WebhookEvent[] = [
  "stasis.detected",
  "activity.resumed",
  "data_gap.detected",
  "observation.available",
  "site.status_changed",
] as const;

export function isWebhookEvent(v: string): v is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(v);
}

// Monitoring AlertType (DB enum) → webhook event name.
const ALERT_TO_EVENT: Record<string, WebhookEvent> = {
  STASIS_DETECTED: "stasis.detected",
  ACTIVITY_RESUMED: "activity.resumed",
  DATA_GAP: "data_gap.detected",
  OBSERVATION_AVAILABLE: "observation.available",
};

export function alertTypeToEvent(alertType: string): WebhookEvent | null {
  return ALERT_TO_EVENT[alertType] ?? null;
}

// The envelope every delivery carries. JSON-serializable, free of internal
// fields; `data` always identifies the site.
export interface WebhookEnvelope {
  id: string;
  event: WebhookEvent;
  created_at: string;
  data: {
    site_id: string;
    site_name: string;
    status: string | null;
    stasis_score: number | null;
    confidence: string | null;
    observed_at: string | null;
  };
}

export function buildEnvelope(input: {
  deliveryId: string;
  event: WebhookEvent;
  createdAt: Date;
  siteId: string;
  siteName: string;
  status?: string | null;
  stasisScore?: number | null;
  confidence?: string | null;
  observedAt?: Date | null;
}): WebhookEnvelope {
  return {
    id: input.deliveryId,
    event: input.event,
    created_at: input.createdAt.toISOString(),
    data: {
      site_id: input.siteId,
      site_name: input.siteName,
      status: input.status ?? null,
      stasis_score: input.stasisScore ?? null,
      confidence: input.confidence ?? null,
      observed_at: input.observedAt ? input.observedAt.toISOString() : null,
    },
  };
}
