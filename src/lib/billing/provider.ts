export interface CreateCheckoutInput {
  priceId: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  /** our reference, echoed back on the webhook to reconcile the site */
  clientReferenceId?: string;
  quantity?: number;
  /** Stripe Checkout mode. Defaults to "subscription" (back-compat). */
  mode?: "payment" | "subscription";
  /** session-level metadata, echoed back on checkout.session.completed */
  metadata?: Record<string, string>;
  /** extra recurring line items (e.g. the Construction Draw Intelligence add-on,
   *  quantity = upgraded sites). Items with quantity <= 0 are ignored. */
  addOns?: Array<{ priceId: string; quantity: number }>;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export interface BillingPortalSession {
  url: string;
}

export type SubscriptionState =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "unknown";

export interface SubscriptionStatus {
  id: string;
  state: SubscriptionState;
  /** epoch seconds */
  currentPeriodEnd?: number;
}

/** The seam between Ground Stasis and any billing vendor. */
export interface BillingProvider {
  readonly name: string;
  isConfigured(): boolean;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession>;
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus>;
  /** Self-service cancel / upgrade / card update (zero human touch). */
  createBillingPortalSession(customerId: string, returnUrl: string): Promise<BillingPortalSession>;
}
