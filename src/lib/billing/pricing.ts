// The Ground Stasis value ladder, in one place.
//
// Free SEO tools  ->  $9 one-time check (tripwire)  ->  $19/mo (1 site)
//   ->  $49/mo (3 sites)  ->  $99/mo (10 sites)
//
// The $9 check PROVES the problem on one site (a single live satellite read).
// The subscriptions CONTINUOUSLY watch it. Seats are granted ONLY by the
// webhook after payment is confirmed (spec §24/§25) and enforced in
// SiteRepository.createSite via getEntitlement().
//
// Price IDs live in the environment (Stripe `price_...` ids), never in code, so
// the same build works across test/live. The env VAR NAMES are here; the VALUES
// are read server-side only.

export type TierId = "check" | "foundation" | "portfolio" | "pro";

export interface TierDef {
  id: TierId;
  label: string;
  /** name of the env var holding this tier's Stripe price id */
  priceEnv: string;
  /** Stripe Checkout mode */
  mode: "payment" | "subscription";
  /** monitored sites this tier grants (0 for the one-time check) */
  seats: number;
  /** display price in whole dollars */
  amount: number;
  cadence: "one-time" | "month";
}

export const TIERS: Record<TierId, TierDef> = {
  check: {
    id: "check",
    label: "Single-site check",
    priceEnv: "STRIPE_PRICE_SITE_CHECK",
    mode: "payment",
    seats: 0,
    amount: 9,
    cadence: "one-time",
  },
  foundation: {
    id: "foundation",
    label: "Foundation",
    // Back-compat: the original single-site subscription used STRIPE_PRICE_ID.
    priceEnv: "STRIPE_PRICE_ID",
    mode: "subscription",
    seats: 1,
    amount: 19,
    cadence: "month",
  },
  portfolio: {
    id: "portfolio",
    label: "Portfolio",
    priceEnv: "STRIPE_PRICE_PORTFOLIO",
    mode: "subscription",
    seats: 3,
    amount: 49,
    cadence: "month",
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceEnv: "STRIPE_PRICE_PRO",
    mode: "subscription",
    seats: 10,
    amount: 99,
    cadence: "month",
  },
};

export function getTier(id: string | undefined | null): TierDef | null {
  if (!id) return null;
  return (TIERS as Record<string, TierDef>)[id] ?? null;
}

/** The Stripe price id for a tier, or undefined when that env var is unset. */
export function tierPriceId(tier: TierDef, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const v = env[tier.priceEnv];
  return v && v.trim() ? v.trim() : undefined;
}

/**
 * Reverse lookup for the webhook: given the Stripe price id on a subscription,
 * return the seats it grants. FAIL-SAFE: an unknown price grants 1 seat, never
 * more than the smallest paid plan — we never over-provision on a mystery price.
 */
export function seatsForPriceId(priceId: string | undefined | null, env: NodeJS.ProcessEnv = process.env): number {
  if (!priceId) return 1;
  for (const t of Object.values(TIERS)) {
    if (t.mode !== "subscription") continue;
    const configured = env[t.priceEnv];
    if (configured && configured.trim() === priceId) return t.seats;
  }
  return 1;
}

// --- Construction Draw Intelligence (per-site add-on to any plan) ------------

export const DRAW_INTELLIGENCE = {
  priceEnv: "STRIPE_PRICE_DRAW_INTELLIGENCE",
  /** dollars / month per upgraded site */
  amount: 15,
  label: "Construction Draw Intelligence",
} as const;

/** The Stripe price id for the CDI add-on, or undefined when unset. */
export function drawIntelligencePriceId(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const v = env[DRAW_INTELLIGENCE.priceEnv];
  return v && v.trim() ? v.trim() : undefined;
}

/** Clamp requested CDI sites to the plan's seat count (can't upgrade more sites than you have). */
export function clampCdiSites(tierId: TierId, cdiSites: number): number {
  const seats = TIERS[tierId].seats;
  const n = Number.isFinite(cdiSites) ? Math.floor(cdiSites) : 0;
  return Math.max(0, Math.min(n, seats));
}

/** Monthly total for a monitoring plan plus N CDI-upgraded sites. Pure — drives
 *  both the UI total and the pricing tests. */
export function subscriptionMonthlyTotal(tierId: TierId, cdiSites = 0): number {
  const tier = TIERS[tierId];
  const base = tier.mode === "subscription" ? tier.amount : 0;
  return base + clampCdiSites(tierId, cdiSites) * DRAW_INTELLIGENCE.amount;
}

// --- client-safe display data (NO env access; safe to import into client) ----

export interface TierDisplay {
  id: TierId;
  name: string;
  amount: number;
  cadence: "one-time" | "month";
  seats: number;
  tagline: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

export const TIER_DISPLAY: TierDisplay[] = [
  {
    id: "check",
    name: "Single-site check",
    amount: 9,
    cadence: "one-time",
    seats: 0,
    tagline: "Prove it on one site, once.",
    features: [
      "One live satellite read on one site",
      "Stasis status, score & confidence",
      "What the satellite actually observed over time",
      "Secure results link, emailed to you",
      "No subscription — pay once",
    ],
    cta: "Run a $9 check",
  },
  {
    id: "foundation",
    name: "Foundation",
    amount: 19,
    cadence: "month",
    seats: 1,
    tagline: "Watch the one site you're worried about.",
    features: [
      "1 monitored site",
      "Continuous satellite monitoring",
      "Email alerts on stasis & resumed activity",
      "Evidence timeline & change metrics",
      "Cancel anytime, self-serve",
    ],
    cta: "Start monitoring",
    highlight: true,
  },
  {
    id: "portfolio",
    name: "Portfolio",
    amount: 49,
    cadence: "month",
    seats: 3,
    tagline: "A small book of loans.",
    features: [
      "Up to 3 monitored sites",
      "Everything in Foundation",
      "One dashboard across sites",
      "Add or swap sites anytime",
    ],
    cta: "Monitor my portfolio",
  },
  {
    id: "pro",
    name: "Pro",
    amount: 99,
    cadence: "month",
    seats: 10,
    tagline: "The whole construction book.",
    features: [
      "Up to 10 monitored sites",
      "Everything in Portfolio",
      "Best per-site price",
      "Priority email support",
    ],
    cta: "Monitor my book",
  },
];
