import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/v1 — public discovery index. No auth; points to docs + the spec.
export async function GET() {
  return NextResponse.json({
    name: "Ground Stasis API",
    version: "v1",
    documentation: "https://groundstasis.com/docs",
    openapi: "https://groundstasis.com/api/v1/openapi.json",
    endpoints: [
      "GET /api/v1/sites",
      "GET /api/v1/sites/{id}",
      "GET /api/v1/sites/{id}/observations",
      "GET /api/v1/checks/{id}",
      "GET /api/v1/usage",
    ],
  });
}
