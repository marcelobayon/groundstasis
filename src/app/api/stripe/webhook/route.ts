import { NextResponse } from "next/server";
import { verifyStripeSignature } from "@/lib/billing";
import { seatsForPriceId, drawIntelligencePriceId, getTier } from "@/lib/billing/pricing";
import { getSiteRepository } from "@/lib/db/repository";
import { createMagicLinkToken } from "@/lib/auth/magic-link";
import { getMagicLinkSecrets } from "@/lib/env";
import { getEmailProvider, getEmailFrom, renderMagicLink, renderCheckReady } from "@/lib/email";
import { sendPurchaseEvent } from "@/lib/analytics-mp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Stripe webhook — the ONLY place payment turns into provisioning (spec §24/§25).
//
//   checkout.session.completed
//     · one-time CHECK ($9)  -> mark the SiteCheck paid, email a secure link
//     · subscription         -> create user + subscription (with seats), email
//                               a setup link so they draw their site
//   customer.subscription.updated  -> update state / period / seats; pause if lapsed
//   customer.subscription.deleted  -> cancel + pause sites (history retained)
//
// Reads the RAW body (required for signature verification).

type StripeObject = Record<string, unknown>;

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function obj(v: unknown): StripeObject | undefined {
  return v && typeof v === "object" ? (v as StripeObject) : undefined;
}

/** Scan a subscription's line items for the plan seats and the CDI add-on qty.
 *  Handles items in any order and multiple line items (plan + CDI add-on). */
function extractSeatsFromItems(subscription: StripeObject): {
  seats?: number;
  cdiSeats?: number;
  planPriceId?: string;
} {
  const items = obj(subscription.items);
  const data = items?.data;
  if (!Array.isArray(data)) return {};
  const cdiPrice = drawIntelligencePriceId();
  let seats: number | undefined;
  // If CDI is configured, default to 0 so a removed add-on correctly zeroes out.
  let cdiSeats: number | undefined = cdiPrice ? 0 : undefined;
  let planPriceId: string | undefined;
  for (const it of data) {
    const o = obj(it);
    const price = obj(o?.price);
    const pid = str(price?.id);
    const qty = num(o?.quantity) ?? 1;
    if (!pid) continue;
    if (cdiPrice && pid === cdiPrice) {
      cdiSeats = qty;
    } else {
      planPriceId = pid;
      seats = seatsForPriceId(pid);
    }
  }
  return { seats, cdiSeats, planPriceId };
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await request.text();
  const verified = verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret ?? "");
  if (!verified.valid) {
    return NextResponse.json({ error: `invalid signature: ${verified.reason}` }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: StripeObject } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const repo = getSiteRepository();
  if (!repo) {
    return NextResponse.json({ received: true, note: "no database configured; event ignored" });
  }

  const data = (event.data?.object ?? {}) as StripeObject;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const metadata = obj(data.metadata) ?? {};
        const clientRef = str(data.client_reference_id) ?? "";
        const isCheck = metadata.gs_kind === "check" || clientRef.startsWith("check:");

        if (isCheck) {
          const token = str(metadata.gs_token) ?? clientRef.replace(/^check:/, "");
          if (token) {
            const paid = await repo.markSiteCheckPaid({
              token,
              stripeSessionId: str(data.id),
              stripePaymentId: str(data.payment_intent),
            });
            if (paid) {
              await emailCheckReady(repo, paid.token, paid.email);
              if (paid.firstPayment) {
                await reportPurchase(data, { itemId: "site_check", itemName: "Single-site satellite check", fallbackValue: 9 });
              }
            }
          }
          break;
        }

        // Subscription checkout.
        const details = obj(data.customer_details);
        const email = str(details?.email) ?? str(data.customer_email);
        const customerId = str(data.customer);
        const subscriptionId = str(data.subscription);
        const priceId = str(metadata.gs_price);
        const seats = Number(str(metadata.gs_seats) ?? "1") || 1;
        const cdiSeats = Number(str(metadata.gs_cdi_seats) ?? "0") || 0;
        if (email && customerId && subscriptionId) {
          const sub = await repo.recordStripeSubscription({
            email,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            priceId,
            seats,
            drawIntelligenceSeats: cdiSeats,
            state: "active",
          });
          await emailSetupLink(repo, sub.id, email);
          if (sub.created) {
            const tier = getTier(str(metadata.gs_tier));
            await reportPurchase(data, {
              itemId: tier ? `plan_${tier.id}` : "subscription",
              itemName: tier ? `${tier.label} monitoring` : "Ground Stasis monitoring",
              fallbackValue: tier ? tier.amount : 19,
            });
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const id = str(data.id);
        const status = str(data.status);
        const { seats, cdiSeats, planPriceId } = extractSeatsFromItems(data);
        if (id)
          await repo.updateSubscriptionByStripeId(id, {
            state: status,
            currentPeriodEnd: num(data.current_period_end),
            seats,
            drawIntelligenceSeats: cdiSeats,
            priceId: planPriceId,
          });
        if (status && ["canceled", "unpaid", "incomplete_expired", "past_due"].includes(status)) {
          const customerId = str(data.customer);
          if (customerId) await repo.pauseSitesForStripeCustomer(customerId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const id = str(data.id);
        const customerId = str(data.customer);
        if (id) await repo.updateSubscriptionByStripeId(id, { state: "canceled" });
        if (customerId) await repo.pauseSitesForStripeCustomer(customerId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function emailSetupLink(
  repo: NonNullable<ReturnType<typeof getSiteRepository>>,
  userId: string,
  email: string
): Promise<void> {
  const secrets = getMagicLinkSecrets();
  if (secrets.length === 0) return;
  const token = createMagicLinkToken(userId, secrets[0], { ttlMinutes: 60 * 24 * 3, scope: "site:create" });
  const url = `${process.env.APP_URL ?? "https://groundstasis.com"}/setup?token=${encodeURIComponent(token)}`;
  const rendered = renderMagicLink(undefined, url);
  const provider = getEmailProvider();
  const result = await provider.send({
    to: email,
    from: getEmailFrom(),
    subject: "Finish setting up your Ground Stasis site",
    text: rendered.text,
    html: rendered.html,
  });
  await repo.recordEmailEvent({
    to: email,
    type: "setup_link",
    provider: provider.name,
    providerId: result.id,
    subject: "Finish setting up your Ground Stasis site",
    delivered: result.delivered,
  });
}

async function emailCheckReady(
  repo: NonNullable<ReturnType<typeof getSiteRepository>>,
  token: string,
  email: string
): Promise<void> {
  const url = `${process.env.APP_URL ?? "https://groundstasis.com"}/check/${encodeURIComponent(token)}`;
  const rendered = renderCheckReady(url);
  const provider = getEmailProvider();
  const result = await provider.send({
    to: email,
    from: getEmailFrom(),
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
  await repo.recordEmailEvent({
    to: email,
    type: "check_ready",
    provider: provider.name,
    providerId: result.id,
    subject: rendered.subject,
    delivered: result.delivered,
  });
}

async function reportPurchase(
  data: StripeObject,
  opts: { itemId: string; itemName: string; fallbackValue: number }
): Promise<void> {
  const metadata = obj(data.metadata) ?? {};
  const clientId = str(metadata.gs_ga_client_id);
  if (!clientId) return; // no GA client id captured → can't attribute; skip honestly
  const transactionId = str(data.id);
  if (!transactionId) return;
  const amountTotal = num(data.amount_total);
  const value = typeof amountTotal === "number" ? amountTotal / 100 : opts.fallbackValue;
  const currency = (str(data.currency) ?? "usd").toUpperCase();
  await sendPurchaseEvent({
    clientId,
    transactionId,
    value,
    currency,
    items: [{ item_id: opts.itemId, item_name: opts.itemName, price: value, quantity: 1 }],
  });
}
