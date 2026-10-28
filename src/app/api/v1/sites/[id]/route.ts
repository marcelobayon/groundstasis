import { handleRead, methodNotAllowed, ApiError } from "@/lib/api/handler";
import { getSiteRepository } from "@/lib/db/repository";
import { serializeSiteDetail } from "@/lib/api/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/v1/sites/{id} — full detail for one site the caller owns.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handleRead(
    request,
    { scope: "sites:read", operation: "sites.get", route: "/api/v1/sites/{id}" },
    async (ctx) => {
      const repo = getSiteRepository();
      if (!repo) throw new ApiError("server_error", "Database not configured.");
      const site = await repo.getSiteForUser(ctx.userId, params.id);
      if (!site) throw new ApiError("not_found", "Site not found.");
      return { data: serializeSiteDetail(site) };
    },
  );
}

export async function POST() {
  return methodNotAllowed();
}
