import { NextResponse } from "next/server";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link";
import { getMagicLinkSecrets } from "@/lib/env";
import { getSiteRepository } from "@/lib/db/repository";
import { getBillingProvider } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Open the Stripe Customer Portal so the customer can cancel, upgrade, or update
// their card with zero human involvement. Authenticated by the magic-link token.
export async function POST(request: Request) {
  const billing = getBillingProvider();
  const repo = getSiteRepository();
  if (!billing || !repo) {
    return NextResponse.json({ error: "billing or database not configured" }, { status: 503 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const token = body.token ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const auth = token ? verifyMagicLinkToken(token, getMagicLinkSecrets()) : ({ valid: false, reason: "missing token" } as const);
  if (!auth.valid) {
    return NextResponse.json({ error: `unauthorized: ${auth.reason}` }, { status: 401 });
  }

  const customerId = await repo.getStripeCustomerId(auth.payload.sub);
  if (!customerId) {
    return NextResponse.json({ error: "no billing account found for this user" }, { status: 404 });
  }

  const returnUrl = `${process.env.APP_URL ?? "https://groundstasis.com"}/`;
  try {
    const session = await billing.createBillingPortalSession(customerId, returnUrl);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "could not open billing portal" },
      { status: 502 }
    );
  }
}
