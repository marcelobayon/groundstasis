import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/api/openapi";

export const dynamic = "force-dynamic";

// GET /api/v1/openapi.json — machine-readable OpenAPI 3.1 spec.
export async function GET() {
  return NextResponse.json(openApiSpec);
}
