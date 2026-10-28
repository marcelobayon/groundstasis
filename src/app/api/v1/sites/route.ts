import { handleRead, methodNotAllowed, ApiError } from "@/lib/api/handler";
import { getSiteRepository } from "@/lib/db/repository";
import { serializeSiteSummary } from "@/lib/api/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/v1/sites — every site owned by the authenticated key's user.
export async function GET(request: Request) {
  return handleRead(request, { scope: "sites:read", operation: "sites.list", route: "/api/v1/sites" }, async (ctx, req) => {
    const repo = getSiteRepository();
    if (!repo) throw new ApiError("server_error", "Database not configured.");
    const loanNumber = new URL(req.url).searchParams.get("loan_number");
    const sites = loanNumber
      ? await repo.findSitesByLoanNumber(ctx.userId, loanNumber)
      : await repo.getSitesForUser(ctx.userId);
    return { data: sites.map(serializeSiteSummary) };
  });
}

export async function POST() {
  return methodNotAllowed();
}
