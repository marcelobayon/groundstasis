import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  BillingProvider,
  BillingPortalSession,
  CheckoutSession,
  CreateCheckoutInput,
  SubscriptionState,
  SubscriptionStatus,
} from "./provider";

// Stripe via its REST API over fetch (no SDK dependency). MVP surface:
// Checkout session, webhook verification, subscription status, and the
// Customer Portal (self-service cancel/upgrade — keeps billing zero-touch).
//
// IMPORTANT (spec §24): monitoring is NEVER provisioned before payment. The
// webhook (checkout.session.completed / customer.subscription.*) is what flips
// a site to entitled — see app/api/stripe/webhook/route.ts.

export type StripeSignatureResult = { valid: true } | { valid: false; reason: string };

/**
 * Verify a Stripe webhook signature (`Stripe-Signature` header) WITHOUT the SDK.
 * Pure and deterministic (inject `nowMs` in tests).
 * Scheme: header `t=<ts>,v1=<sig>[...]`; signed payload `"<ts>.<rawBody>"`,
 * HMAC-SHA256 with the endpoint secret, hex-encoded.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null | undefined,
  secret: string,
  opts: { toleranceSec?: number; nowMs?: number } = {}
): StripeSignatureResult {
  if (!secret) return { valid: false, reason: "no webhook secret configured" };
  if (!header) return { valid: false, reason: "missing signature header" };

  const tolerance = opts.toleranceSec ?? 300;
  const nowSec = (opts.nowMs ?? Date.now()) / 1000;

  let timestamp = "";
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key === "t") timestamp = val;
    else if (key === "v1") v1.push(val);
  }
  if (!timestamp || v1.length === 0) return { valid: false, reason: "malformed signature header" };

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const match = v1.some((sig) => safeEqualHex(expected, sig));
  if (!match) return { valid: false, reason: "no matching v1 signature" };
  if (Math.abs(nowSec - Number(timestamp)) > tolerance) {
    return { valid: false, reason: "timestamp outside tolerance" };
  }
  return { valid: true };
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function mapState(status: string | undefined): SubscriptionState {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
      return status;
    default:
      return "unknown";
  }
}

export class StripeProvider implements BillingProvider {
  readonly name = "stripe";
  private readonly base = "https://api.stripe.com/v1";

  constructor(private readonly secretKey: string) {}

  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  private async post(path: string, form: Record<string, string>): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.base}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(form),
    });
    if (!res.ok) throw new Error(`Stripe ${path} failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
    return (await res.json()) as Record<string, unknown>;
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
    if (!this.isConfigured()) throw new Error("StripeProvider: STRIPE_SECRET_KEY missing");
    const mode = input.mode ?? "subscription";
    const form: Record<string, string> = {
      mode,
      "line_items[0][price]": input.priceId,
      "line_items[0][quantity]": String(input.quantity ?? 1),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      allow_promotion_codes: "true",
    };
    if (input.customerEmail) form.customer_email = input.customerEmail;
    if (input.clientReferenceId) form.client_reference_id = input.clientReferenceId;
    if (input.metadata) {
      for (const [k, v] of Object.entries(input.metadata)) form[`metadata[${k}]`] = v;
    }
    // Extra recurring line items (CDI add-on). line_items[0] is the plan above.
    let li = 1;
    for (const addOn of input.addOns ?? []) {
      if (!addOn.priceId || addOn.quantity <= 0) continue;
      form[`line_items[${li}][price]`] = addOn.priceId;
      form[`line_items[${li}][quantity]`] = String(addOn.quantity);
      li += 1;
    }
    const json = await this.post("/checkout/sessions", form);
    return { id: String(json.id), url: String(json.url) };
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
    if (!this.isConfigured()) throw new Error("StripeProvider: STRIPE_SECRET_KEY missing");
    const res = await fetch(`${this.base}/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    if (!res.ok) throw new Error(`Stripe subscription fetch failed: ${res.status}`);
    const json = (await res.json()) as { id: string; status?: string; current_period_end?: number };
    return { id: json.id, state: mapState(json.status), currentPeriodEnd: json.current_period_end };
  }

  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<BillingPortalSession> {
    if (!this.isConfigured()) throw new Error("StripeProvider: STRIPE_SECRET_KEY missing");
    const json = await this.post("/billing_portal/sessions", { customer: customerId, return_url: returnUrl });
    return { url: String(json.url) };
  }
}
