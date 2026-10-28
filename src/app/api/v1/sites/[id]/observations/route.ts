import { handleRead, methodNotAllowed, ApiError } from "@/lib/api/handler";
import { getSiteRepository } from "@/lib/db/repository";
import { serializeObservation, parseLimit } from "@/lib/api/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/v1/sites/{id}/observations?limit=&cursor= — paginated observation
// history (newest first). Cursor-based: pass the returned next_cursor to page on.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handleRead(
    request,
    { scope: "sites:read", operation: "sites.observations", route: "/api/v1/sites/{id}/observations" },
    async (ctx, req) => {
      const repo = getSiteRepository();
      if (!repo) throw new ApiError("server_error", "Database not configured.");
      const url = new URL(req.url);
      const limit = parseLimit(url.searchParams.get("limit"), 50, 100);
      const cursor = url.searchParams.get("cursor") ?? undefined;
      const res = await repo.getObservationsForSite(ctx.userId, params.id, { limit, cursor });
      if (!res.siteExists) throw new ApiError("not_found", "Site not found.");
      return { data: res.items.map(serializeObservation), next_cursor: res.nextCursor };
    },
  );
}

export async function POST() {
  return methodNotAllowed();
}
