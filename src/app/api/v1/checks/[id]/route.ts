import { handleRead, methodNotAllowed, ApiError } from "@/lib/api/handler";
import { getSiteRepository } from "@/lib/db/repository";
import { serializeCheck } from "@/lib/api/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/v1/checks/{id} — result of a one-off activity check. Checks are the
// $9 email+token flow and carry no userId, so ownership is matched on the
// check's email == the key owner's email.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handleRead(
    request,
    { scope: "sites:read", operation: "checks.get", route: "/api/v1/checks/{id}" },
    async (ctx) => {
      const repo = getSiteRepository();
      if (!repo) throw new ApiError("server_error", "Database not configured.");
      const check = await repo.getSiteCheckForUser(ctx.userId, params.id);
      if (!check) throw new ApiError("not_found", "Check not found.");
      return { data: serializeCheck(check) };
    },
  );
}

export async function POST() {
  return methodNotAllowed();
}
