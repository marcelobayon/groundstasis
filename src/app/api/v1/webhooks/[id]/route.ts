import { handleRead, methodNotAllowed, ApiError } from "@/lib/api/handler";
import { webhookStoreAvailable, disableWebhookEndpoint } from "@/lib/api/webhooks/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// DELETE /api/v1/webhooks/{id} — unsubscribe: what Zapier calls when a Zap is
// turned off. Soft-disables the endpoint (tenant-checked). Scope: webhooks:manage.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  return handleRead(
    request,
    { scope: "webhooks:manage", operation: "webhooks.unsubscribe", route: "/api/v1/webhooks/{id}" },
    async (ctx) => {
      if (!webhookStoreAvailable()) throw new ApiError("server_error", "Database not configured.");
      const ok = await disableWebhookEndpoint(ctx.userId, params.id);
      if (!ok) throw new ApiError("not_found", "Webhook not found.");
      return { data: { deleted: true } };
    },
  );
}

export async function GET() {
  return methodNotAllowed();
}
