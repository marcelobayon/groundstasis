import { handleRead, methodNotAllowed } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/v1/me — identify the account behind an API key. Any valid key works
// (no scope required); used by Zapier/clients to label the connection and to
// validate a key during setup.
export async function GET(request: Request) {
  return handleRead(request, { operation: "me", route: "/api/v1/me" }, async (ctx) => {
    return { data: { account_id: ctx.userId, scopes: ctx.scopes } };
  });
}

export async function POST() {
  return methodNotAllowed();
}
