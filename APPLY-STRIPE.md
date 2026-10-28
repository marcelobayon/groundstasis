# Ground Stasis — Stripe money-engine patch

Adds the **$19/site/month subscription** + **Stripe Customer Portal** (self-service
cancel/upgrade — keeps billing zero-touch) and the entitlement flow that creates a
site **only after payment**. Designed so the $9 one-time check and $49/$99 tiers
drop in later without a rewrite.

> **Apply the DB patch first.** This patch builds on it. The included
> `src/lib/db/repository.ts` and `src/lib/db/mappers.ts` are the **newer** versions
> and supersede the ones in the DB patch — use these.

## Files

**New**
- `src/app/api/billing-portal/route.ts` — opens the Stripe Customer Portal (magic-link authed).
- `src/app/api/sites/route.ts` — creates a site after payment (magic-link authed, entitlement-enforced).

**Changed (full-file — supersede your current copies)**
- `src/lib/billing/provider.ts`, `src/lib/billing/stripe-provider.ts`, `src/lib/billing/index.ts` — add `createBillingPortalSession`.
- `src/lib/db/repository.ts` — adds `findOrCreateUserByEmail`, `recordStripeSubscription`, `updateSubscriptionByStripeId`, `pauseSitesForStripeCustomer`, `getEntitlement`, `getStripeCustomerId`, `createSite`.
- `src/lib/db/mappers.ts` — adds `toDbSubscriptionState`.
- `src/app/api/stripe/webhook/route.ts` — implements the entitlement handlers.

## The flow (pay → email → draw → monitor), fully zero-touch

```
Landing "Monitor a site"
        │  POST /api/checkout  (Stripe collects email + card)
        ▼
Stripe Checkout ── payment ──▶ webhook: checkout.session.completed
        │                         • create user + subscription (active)
        │                         • email a secure setup link (/setup?token=…)
        ▼
Customer clicks link ─▶ /setup?token=…  (draws boundary)
        │  POST /api/sites  (token authed, seat-checked)
        ▼
Site created ─▶ scheduled analysis monitors it ─▶ alerts
```

Lapsed/canceled subscriptions (webhook `customer.subscription.updated/deleted`)
pause that user's sites — history is never deleted.

## What I verified, and where

- **Locally:** the billing provider (incl. the new portal method) typechecks clean — it's pure `fetch` + crypto. The webhook signature verifier is unit-tested (from the DB-patch suite).
- **In your tree:** the Prisma-typed files (`repository`, `mappers`, webhook, routes). As before, my sandbox can't run `prisma generate`, so run `npm run db:generate && npm run typecheck` after copying.

## Stripe dashboard setup (once)

1. **Product + price:** create a Product "Ground Stasis — Site Monitoring" with a **recurring $19/month** price. Copy the price id → `STRIPE_PRICE_ID`.
2. **API key:** Developers → API keys → secret key → `STRIPE_SECRET_KEY`.
3. **Customer Portal:** Settings → Billing → Customer portal → **Activate**, and allow "cancel subscription" and "update payment method."
4. **Webhook:** Developers → Webhooks → Add endpoint `=> {APP_URL}/api/stripe/webhook`. Send events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.

## Env vars (Netlify + .env.local)

```
STRIPE_SECRET_KEY=sk_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
MAGIC_LINK_SECRET=<openssl rand -hex 32>   # signs the setup link
APP_URL=https://groundstasis.com
EMAIL_PROVIDER=resend                       # so the setup link actually sends
EMAIL_API_KEY=...
EMAIL_FROM=alerts@groundstasis.com
DATABASE_URL=postgresql://...               # from the DB patch
```

## Three small client wirings (snippets)

These are the only front-end changes. They're small, so they're described rather than shipped as big files.

**1. Landing "Monitor a site" → start checkout** (replace the button's `href` with an onClick, or add a small client handler):
```tsx
async function startCheckout() {
  const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
  else alert(data.message ?? "Checkout is not configured yet");
}
```

**2. `/setup` — when it arrives with `?token=…`, create the site instead of charging.** In `src/app/setup/page.tsx` (already a client component) add near the top:
```tsx
import { useSearchParams } from "next/navigation";
// inside the component:
const token = useSearchParams().get("token");
```
and make the submit branch on it:
```tsx
async function startMonitoring() {
  if (token) {
    const res = await fetch("/api/sites", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token, name: projectName, address, geometry: JSON.parse(geojson),
        loanAmount: loanAmount ? Number(loanAmount.replace(/[^0-9.]/g, "")) : undefined,
        constructionStart: start || undefined, constructionEnd: completion || undefined,
      }),
    });
    const data = await res.json();
    setMessage(data.ok ? `Site created (${data.areaAcres.toFixed(1)} acres, ${data.suitability}). Monitoring starts on the next clear satellite pass.` : (data.error ?? "Could not create site"));
    return;
  }
  // no token -> send them to pay first
  const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
  const data = await res.json();
  if (data.url) window.location.href = data.url; else setMessage(data.message ?? "Checkout unavailable");
}
```
Next 14 note: `useSearchParams()` wants a `<Suspense>` boundary for static pages. `/setup` already renders dynamically, but if the build complains, add `export const dynamic = "force-dynamic";` to the page.

**3. "Manage billing" button** (anywhere a signed-in customer lands, e.g. the dashboard) → opens the portal:
```tsx
async function manageBilling(token: string) {
  const res = await fetch("/api/billing-portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}
```

## Test it (Stripe test mode)

Use test keys + the Stripe CLI to forward webhooks locally:
```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Run checkout with test card `4242 4242 4242 4242`. Confirm: a user + subscription row appear, the setup-link email prints to the console (or sends via Resend), `/setup?token=…` creates a site, and canceling in the portal pauses it.

## What's deliberately NOT here (per the monetization decision)
$9 one-time check, $49/$99 tiers, weekly digest — all fast-follows on this same
infrastructure, not rewrites. See `monetization-decision.md` in the project.
