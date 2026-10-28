// Server-side GA4 Measurement Protocol.
//
// Fires a VERIFIED `purchase` event from the Stripe webhook after a confirmed
// payment. This is the only place a purchase is reported to GA4 — never from a
// checkout-start or a success-page view.
//
// NEVER import this from client code: it reads GA4_API_SECRET (a server-only
// secret). All failures are swallowed; reporting analytics must never block or
// fail payment provisioning.

import { SITE } from "@/lib/config/site";

export interface PurchaseItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

export interface PurchaseInput {
  /** GA4 client_id captured at checkout and carried through Stripe metadata. */
  clientId: string;
  /** Stripe Checkout Session id — the idempotent transaction id. */
  transactionId: string;
  value: number;
  currency: string;
  items: PurchaseItem[];
}

export async function sendPurchaseEvent(input: PurchaseInput): Promise<void> {
  try {
    const apiSecret = process.env.GA4_API_SECRET;
    const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? SITE.gaId;
    // Unconfigured (no secret) or unattributable (no client_id) → skip quietly.
    if (!apiSecret || !measurementId || !input.clientId) return;

    const url =
      `https://www.google-analytics.com/mp/collect` +
      `?measurement_id=${encodeURIComponent(measurementId)}` +
      `&api_secret=${encodeURIComponent(apiSecret)}`;

    const body = {
      client_id: input.clientId,
      // non_personalized_ads keeps this a clean conversion ping
      events: [
        {
          name: "purchase",
          params: {
            transaction_id: input.transactionId,
            value: input.value,
            currency: input.currency,
            items: input.items,
          },
        },
      ],
    };

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // A slow analytics beacon must never delay the webhook's 200 to Stripe.
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    /* swallow — analytics must never affect provisioning */
  }
}
