import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getBillingProvider } from "@/lib/billing";
import { getTier, tierPriceId, clampCdiSites, drawIntelligencePriceId, type TierDef } from "@/lib/billing/pricing";
import { getSiteRepository } from "@/lib/db/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Creates a Stripe Checkout session for any rung of the value ladder:
//   check       -> $9 one-time single-site check   (mode: payment)
//   foundation  -> $19/mo, 1 site                   (mode: subscription)
//   portfolio   -> $49/mo, 3 sites                  (mode: subscription)
//   pro         -> $99/mo, 10 sites                 (mode: subscription)
//
// Entitlement / the paid check is granted ONLY after the webhook confirms
// payment (spec §24/§25). This route just opens the session.

function appUrl(): string {
  return process.env.APP_URL ?? "https://groundstasis.com";
}

export async function POST(request: Request) {
  const billing = getBillingProvider();
  if (!billing) {
    return NextResponse.json(
      { configured: false, message: "Billing is not configured. Set STRIPE_SECRET_KEY and the tier price ids." },
      { status: 503 }
    );
  }

  let body: { email?: string; tier?: string; cdi?: number; gaClientId?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const tier = getTier(body.tier) ?? getTier("foundation")!;
  const priceId = tierPriceId(tier);
  if (!priceId) {
    return NextResponse.json(
      { configured: false, message: `Price is not set for the ${tier.label} plan (${tier.priceEnv}).` },
      { status: 503 }
    );
  }

  if (tier.mode === "payment") {
    return startCheck(billing, tier, priceId, body.email, body.gaClientId);
  }
  return startSubscription(billing, tier, priceId, body.email, body.cdi ?? 0, body.gaClientId);
}

/** The $9 tripwire: create the check row + token, open a one-time payment. */
async function startCheck(
  billing: NonNullable<ReturnType<typeof getBillingProvider>>,
  tier: TierDef,
  priceId: string,
  email: string | undefined,
  gaClientId: string | undefined
) {
  const repo = getSiteRepository();
  if (!repo) {
    return NextResponse.json(
      { configured: false, message: "The single-site check needs the database configured (DATABASE_URL)." },
      { status: 503 }
    );
  }
  const cleanEmail = (email ?? "").trim();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return NextResponse.json({ configured: true, error: "A valid email is required for the check." }, { status: 400 });
  }

  const token = randomBytes(18).toString("hex");
  try {
    await repo.createSiteCheck({ email: cleanEmail, token });
    const session = await billing.createCheckoutSession({
      priceId,
      mode: "payment",
      customerEmail: cleanEmail,
      successUrl: `${appUrl()}/check/${token}?paid=1`,
      cancelUrl: `${appUrl()}/?checkout=cancelled`,
      clientReferenceId: `check:${token}`,
      metadata: { gs_kind: "check", gs_token: token, ...(gaClientId ? { gs_ga_client_id: gaClientId } : {}) },
    });
    // Best-effort: record the session id for reconciliation (never blocks checkout).
    try {
      await repo.attachCheckoutSessionToCheck(token, session.id);
    } catch {
      /* non-fatal */
    }
    return NextResponse.json({ configured: true, url: session.url, id: session.id, token, tier: tier.id });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "checkout failed" },
      { status: 502 }
    );
  }
}

/** A monitoring subscription: carry seats (and any CDI add-on) in metadata so
 *  the webhook grants them. CDI is a second recurring line item, qty = sites. */
async function startSubscription(
  billing: NonNullable<ReturnType<typeof getBillingProvider>>,
  tier: TierDef,
  priceId: string,
  email: string | undefined,
  cdiRequested: number,
  gaClientId: string | undefined
) {
  const cleanEmail = (email ?? "").trim();
  const cdiSites = clampCdiSites(tier.id, cdiRequested);
  const cdiPrice = drawIntelligencePriceId();
  if (cdiSites > 0 && !cdiPrice) {
    return NextResponse.json(
      { configured: false, message: "Draw Intelligence price is not set (STRIPE_PRICE_DRAW_INTELLIGENCE)." },
      { status: 503 }
    );
  }
  try {
    const session = await billing.createCheckoutSession({
      priceId,
      mode: "subscription",
      customerEmail: cleanEmail || undefined,
      successUrl: `${appUrl()}/setup?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl()}/?checkout=cancelled`,
      clientReferenceId: cleanEmail ? `email:${cleanEmail}` : `tier:${tier.id}`,
      metadata: {
        gs_tier: tier.id,
        gs_seats: String(tier.seats),
        gs_price: priceId,
        gs_cdi_seats: String(cdiSites),
        ...(cdiPrice ? { gs_cdi_price: cdiPrice } : {}),
        ...(gaClientId ? { gs_ga_client_id: gaClientId } : {}),
      },
      addOns: cdiSites > 0 && cdiPrice ? [{ priceId: cdiPrice, quantity: cdiSites }] : [],
    });
    return NextResponse.json({ configured: true, url: session.url, id: session.id, tier: tier.id, cdiSites });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "checkout failed" },
      { status: 502 }
    );
  }
}
