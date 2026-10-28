import type { BillingProvider } from "./provider";
import { StripeProvider } from "./stripe-provider";

export * from "./provider";
export { StripeProvider, verifyStripeSignature } from "./stripe-provider";

/** Returns a configured Stripe provider, or null when billing is not set up. */
export function getBillingProvider(env: NodeJS.ProcessEnv = process.env): BillingProvider | null {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new StripeProvider(key);
}
