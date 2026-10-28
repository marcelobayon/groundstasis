import { handleRead, ApiError } from "@/lib/api/handler";
import {
  webhookStoreAvailable,
  createWebhookEndpoint,
  listWebhookEndpoints,
} from "@/lib/api/webhooks/store";
import { validateWebhookUrl } from "@/lib/api/webhooks/ssrf";
import { isWebhookEvent } from "@/lib/api/webhooks/events";
import { encryptSecret, generateWebhookSecret } from "@/lib/api/webhooks/secret-crypto";
import { getWebhookEncKey } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// API-key-authenticated webhook management, shaped for Zapier REST Hooks and
// other programmatic clients. Scope: webhooks:manage.

// POST /api/v1/webhooks — subscribe: register a target URL for events. This is
// what Zapier calls when a Zap is turned on. Body: { target_url, events[] }.
export async function POST(request: Request) {
  return handleRead(
    request,
    { scope: "webhooks:manage", operation: "webhooks.subscribe", route: "/api/v1/webhooks" },
    async (ctx, req) => {
      if (!webhookStoreAvailable()) throw new ApiError("server_error", "Database not configured.");
      const encKey = getWebhookEncKey();
      if (!encKey) throw new ApiError("server_error", "Webhooks are not configured.");
      let body: { target_url?: string; url?: string; events?: string[] } = {};
      try {
        body = await req.json();
      } catch {
        throw new ApiError("invalid_request", "Invalid JSON.");
      }
      const v = validateWebhookUrl((body.target_url ?? body.url ?? "").trim());
      if (!v.ok) throw new ApiError("invalid_request", `Invalid URL: ${v.reason}.`);
      const events = (Array.isArray(body.events) ? body.events : []).filter(isWebhookEvent);
      if (events.length === 0) throw new ApiError("invalid_request", "Provide at least one valid event.");

      const secret = generateWebhookSecret();
      const row = await createWebhookEndpoint({
        userId: ctx.userId,
        url: v.url.toString(),
        secretCipher: encryptSecret(secret, encKey),
        events,
        description: "Zapier / API",
      });
      return { data: { id: row.id, url: row.url, events: row.events } };
    },
  );
}

// GET /api/v1/webhooks — list the key owner's active endpoints.
export async function GET(request: Request) {
  return handleRead(
    request,
    { scope: "webhooks:manage", operation: "webhooks.list", route: "/api/v1/webhooks" },
    async (ctx) => {
      if (!webhookStoreAvailable()) throw new ApiError("server_error", "Database not configured.");
      const rows = await listWebhookEndpoints(ctx.userId);
      return { data: rows.filter((r) => r.active).map((r) => ({ id: r.id, url: r.url, events: r.events })) };
    },
  );
}
