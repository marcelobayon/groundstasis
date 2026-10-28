# Ground Stasis — Technical Handbook & Developer Handoff

**Version:** 1.0 · **Last updated:** 2026-10-28 · **Status:** Living document

**Audit scope.** This handbook was written by inspecting the repository directly: the Prisma schema,
App Router pages and API routes, the analysis engine, the satellite providers, billing, auth,
webhooks, scheduled functions, analytics, and the existing root-level docs (`ARCHITECTURE.md`,
`ALGORITHM.md`, `SATELLITE_DATA.md`, `ENVIRONMENT.md`, `README.md`). Where this handbook and an older
root doc disagree, **this handbook reflects the current code** and the discrepancy is called out.

**How to read the status labels.**
- **[Verified]** — confirmed by reading the implementation.
- **[Runtime-verify]** — code exists and is correct by inspection, but its live/production behavior
  should be confirmed against the real service (Stripe, CDSE, GA4) before you rely on it.
- **[Planned]** — described in a plan/comment but not implemented.
- **[Superseded]** — an older doc describes this differently; the old description is out of date.

> **Important reconciliation.** `ARCHITECTURE.md` and `ENVIRONMENT.md` predate a large body of work and
> say persistence is "spec only; not wired in the MVP." **[Superseded]** — persistence, an
> authenticated account area, a public REST API, API keys, a usage ledger, and outbound webhooks are
> all implemented now (see §E, §F, §G, §H). Treat those two docs as accurate for the *analysis engine,
> satellite pipeline, and cost philosophy*, and this handbook as authoritative for everything else.

---

## Table of contents

- [A. System overview](#a-system-overview)
- [B. Repository map & feature-to-file index](#b-repository-map--feature-to-file-index)
- [C. Satellite data & analysis pipeline](#c-satellite-data--analysis-pipeline)
- [D. Application architecture & request lifecycle](#d-application-architecture--request-lifecycle)
- [E. Database & data model](#e-database--data-model)
- [F. Authentication, authorization & account ownership](#f-authentication-authorization--account-ownership)
- [G. API architecture & integrations](#g-api-architecture--integrations)
- [H. Webhooks & asynchronous processing](#h-webhooks--asynchronous-processing)
- [I. Stripe, products, billing & entitlements](#i-stripe-products-billing--entitlements)
- [J. Email, notifications & scheduled jobs](#j-email-notifications--scheduled-jobs)
- [K. SEO, public tools & distribution](#k-seo-public-tools--distribution)
- [L. Google Analytics 4 event dictionary](#l-google-analytics-4-event-dictionary)
- [M. Deployment, configuration & environments](#m-deployment-configuration--environments)
- [N. Security, privacy & data integrity](#n-security-privacy--data-integrity)
- [O. Troubleshooting runbooks](#o-troubleshooting-runbooks)
- [P. Junior developer onboarding](#p-junior-developer-onboarding)
- [Q. FAQ](#q-faq)
- [R. Known gaps & handoff priorities](#r-known-gaps--handoff-priorities)

---

## A. System overview

**The customer problem.** A construction lender funds a building project in draws. Between draw
inspections (often weeks apart) the lender has no independent way to know whether the site is actually
progressing. A stalled project is a leading risk indicator, but it usually surfaces late — at the next
inspection or when a draw request looks wrong. Ground Stasis watches a financed site **by satellite**
and flags when it has gone unusually quiet, so a stall becomes an email this week rather than a
surprise at the next draw.

**What it is (and is not).** It is an **independent remote monitoring signal**. It is **not** a
replacement for physical inspection, fund control, appraisal, or underwriting judgment, and it never
concludes that construction has "stopped" — only that observable surface change is unusually low. A
cloudy or missing image is reported as a **DATA GAP**, never as inactivity. This integrity rule is
enforced in code (see §C) and must be preserved in any change.

**Two products on one engine.**
- **One-time check ($9):** a single live satellite read on one site → a status/score/confidence +
  an evidence timeline, emailed as a secure link. Proves the problem once. Model: `SiteCheck`.
- **Recurring monitoring ($19/$49/$99/mo):** continuous monitoring of 1/3/10 sites with email alerts
  on stasis and resumed activity. Model: `Site` + `Subscription`.
- **Construction Draw Intelligence (CDI, +$15/site/mo):** compares a customer-reported construction
  milestone against the satellite evidence and emails a finding when they diverge. [Verified] —
  `src/lib/cdi/`, `SiteMilestone` model, per-site `drawIntelligence` flag.

**Positioning.** Ground Stasis is framed as *construction-activity-intelligence infrastructure* —
satellite imagery is one (swappable) sensor. The value stack is OBSERVATION → INTERPRETATION → STATUS
→ ALERT → WORKFLOW → API → DATA, and each layer is independently monetizable. See the project doc
`positioning.md`.

**Technology stack.**

| Component | Choice | Role |
| --- | --- | --- |
| Framework | Next.js 14.2.35 (App Router) | Pages, server components, API route handlers |
| Language | TypeScript (strict) | One language front-to-back |
| UI | React 18.3.1, server components by default | Dashboard + public pages |
| Analysis engine | Pure TS, zero deps (`src/lib/analysis`) | Deterministic stasis heuristic |
| Satellite | CDSE Sentinel Hub **Statistical API** | Server-side polygon statistics (no raster downloads) |
| Database | PostgreSQL (Neon) via **Prisma 5.22** | Sites, observations, alerts, subscriptions, API keys, webhooks |
| Billing | Stripe (Checkout + Customer Portal + webhooks) | One-time + subscription |
| Email | Pluggable: console (default) / Resend | Alerts, magic links, results |
| Auth | HMAC-signed magic-link tokens (`node:crypto`) | Passwordless, scoped |
| Analytics | GA4 (client events + server-side purchase) | Funnel + verified conversions |
| Hosting | Netlify (`@netlify/plugin-nextjs` v5) + scheduled functions | App + cron |

**High-level architecture.**

```
                 ┌─────────────────────────── Netlify (Next.js app) ───────────────────────────┐
  Browser ─────▶ │  Public SEO pages + tools      Account area (/account)     API v1 (/api/v1) │
                 │  Checkout / $9 check flow       (magic-link, scoped)        (API-key auth)   │
                 │  Next server handler (SSR + all /api route handlers)                         │
                 │  Scheduled functions: scheduled-analysis (6h), scheduled-webhook-delivery(1m)│
                 └───┬───────────────┬───────────────┬───────────────┬───────────────┬──────────┘
                     │               │               │               │               │
                     ▼               ▼               ▼               ▼               ▼
              Postgres (Neon)   CDSE Statistical   Stripe        Email (Resend/   GA4 (Measurement
              via Prisma        API (Sentinel-2)   (billing)     console)         Protocol + gtag)
```

---

## B. Repository map & feature-to-file index

```
src/
  app/                     App Router: pages + API route handlers
    page.tsx               Homepage (SoftwareApplication schema + pricing)
    layout.tsx             Root layout: Organization schema, GA injection, Nav/Footer
    account/page.tsx       Authenticated account area (portfolio + API keys + webhooks)
    construction-*/        SEO pages: hub, pillars, calculators, checklists, forms
    construction-loan-monitoring/[location]/  12 programmatic market pages (SEO)
    utility-construction-inspection-form/     free tool (Tier 2)
    integrations/zapier/   Zapier integration landing page
    docs/                  Public API documentation page
    media-kit/             Press/brand assets page
    api/                   Route handlers (see §G, §H, §I, §J)
  components/              UI (chrome Nav/Footer, pricing, tools/*, account/*, cdi/*)
  lib/
    analysis/              PURE deterministic engine (imports nothing outside itself)
    satellite/             Provider interface + Demo + SentinelHub (CDSE)
    geo/                   Geometry: area, validation, suitability, geocode
    auth/magic-link.ts     HMAC-signed token create/verify
    account/session.ts     verifyAccountToken (account-scoped gate for /account + account APIs)
    billing/               Stripe adapter, pricing tiers, webhook verify
    email/                 Provider interface + console + Resend + templates
    api/                   Public API v1: keys, auth, meter, errors, handler, serialize,
                           openapi, webhooks/* (sign, ssrf, secret-crypto, events, store,
                           emit, delivery-policy)
    jobs/                  analyze-site, run (scheduled orchestration), demo, deliver-webhooks
    db/                    Prisma client, repository (data access), mappers, idempotency
    seo/locations.ts       Market list for the [location] pages
    config/site.ts         SITE constants (url, gaId, etc.)
    env.ts                 Typed env readers + capabilities()
  data/demo-site.ts        Synthetic DEMO_SITE timeline
prisma/schema.prisma       Data model + migrations
netlify/functions/         scheduled-analysis.ts, scheduled-webhook-delivery.ts
zapier-app/                Separate Zapier Platform CLI app (deploys to Zapier, not Netlify)
```

**Feature → where to start:**

| To change… | Start in |
| --- | --- |
| The stasis score / thresholds | `src/lib/analysis/config.ts` (then bump `THRESHOLDS_VERSION`) |
| Status bands / override rules | `src/lib/analysis/status.ts`, `stasis.ts` |
| How satellite data is fetched | `src/lib/satellite/sentinelhub-provider.ts` |
| A monitoring run | `src/lib/jobs/analyze-site.ts` + `src/lib/jobs/run.ts` |
| What's stored / read | `src/lib/db/repository.ts` + `prisma/schema.prisma` |
| Pricing / tiers / seats | `src/lib/billing/pricing.ts` |
| Payment fulfillment | `src/app/api/stripe/webhook/route.ts` |
| Account sign-in | `src/app/api/magic-link/route.ts` + `src/lib/account/session.ts` |
| Public API endpoints | `src/app/api/v1/**` + `src/lib/api/**` |
| Webhook delivery | `src/lib/jobs/deliver-webhooks.ts` + `src/lib/api/webhooks/**` |
| A GA4 event | `src/lib/analytics.ts` (+ `analytics-mp.ts` for server purchase) |
| An SEO page / tool | `src/app/<slug>/page.tsx` + `src/components/tools/*` + `src/app/sitemap.ts` |

---

## C. Satellite data & analysis pipeline

This is the heart of the product and the most stable code. Two root docs are authoritative and should
be read in full: **[`SATELLITE_DATA.md`](../SATELLITE_DATA.md)** (data source, CDSE Statistical API,
evalscript, provider abstraction) and **[`ALGORITHM.md`](../ALGORITHM.md)** (the full stasis heuristic,
thresholds, and overrides). This section summarizes and points into the code.

**Source.** Copernicus **Sentinel-2 L2A** surface reflectance, via the **Sentinel Hub Statistical
API** on the Copernicus Data Space Ecosystem (CDSE). The API computes cloud-masked, polygon-level
statistics (NDVI, NDBI, BSI) **server-side** — Ground Stasis never downloads rasters. [Verified]
`src/lib/satellite/sentinelhub-provider.ts`.

**Provider abstraction.** `src/lib/satellite/provider.ts` defines `SatelliteProvider`. Two
implementations: `DemoProvider` (synthetic `DEMO_SITE`, the default when unconfigured) and
`SentinelHubProvider` (CDSE). `getSatelliteProvider()` chooses by `SATELLITE_PROVIDER` and **falls
back to demo if the live provider is selected but unconfigured** — the app never crashes for a missing
key. [Verified]

**Pipeline (one site):**
```
getAvailableObservations (provider) → usability filter → site-level change → baseline
   → stasis score (0–100) → confidence (HIGH/MED/LOW, independent) → status → alert decision
```
Implemented in `src/lib/analysis/*` (pure) and orchestrated by `src/lib/jobs/analyze-site.ts`.

**Integrity rules enforced in code (do not weaken):**
- A provider failure or insufficient/stale data → **DATA GAP**, never STASIS. [Verified] `analyze-site.ts`.
- A `STASIS` score on **LOW confidence** is capped to `REVIEW`. [Verified] `status.ts`.
- There is no automated `ABANDONED`/`FRAUD` status. The engine makes no legal/underwriting conclusion.

**Versioning.** Every evaluation records `analysisVersion` (`stasis-v0.1`) and `thresholdsVersion`
(`thresholds-v0.1`). Historical scores are never silently rewritten; recalculation under a new version
is explicit. [Verified] `src/lib/analysis/config.ts`.

**[Runtime-verify]** The CDSE **response field names** (`outputs`/`bands`/`stats`/`percentiles`)
should be validated against a real API response the first time live credentials run; the parser is
written defensively for this reason (noted in `SATELLITE_DATA.md`).

**Limitations (state them to any customer).** Satellite-derived surface change is *indirect* evidence
of activity, not proof of completed work, contractor performance, loan compliance, or draw
eligibility. Revisit cadence + clouds mean a usable image isn't guaranteed on any pass.

---

## D. Application architecture & request lifecycle

**Rendering.** Next.js App Router. Public pages are server components, mostly **static** (prerendered
at build). The account area and all `/api/**` handlers are **dynamic** (`force-dynamic`, server-rendered
on demand). Heavy work never happens in a page render — it runs in the scheduled jobs.

**The layered rule (still holds).** `src/lib/analysis` imports nothing outside itself — pure,
deterministic, fully unit-tested. Everything else (providers, db, jobs, api) depends inward on it, not
the reverse. This is what lets the engine be tested in isolation and reused.

**Key request flows (traced through real files):**

- **$9 check:** `/construction-activity-check` → `components/check/CheckFlow.tsx` → `POST /api/checkout`
  (Stripe Checkout, mode `payment`) → Stripe → `POST /api/stripe/webhook` (on
  `checkout.session.completed`) marks the `SiteCheck` paid → the single analysis runs via `analyzeSite`
  → result stored on the `SiteCheck` → emailed as a tokenized link → viewed at `/check/[token]`.
- **Subscription:** `/#pricing` (`components/pricing-section.tsx`) → `POST /api/checkout` (mode
  `subscription`) → Stripe → webhook `recordStripeSubscription` grants seats → sites created via
  `repository.createSite` (entitlement-checked) → monitored by the scheduled job.
- **Scheduled monitoring:** `scheduled-analysis` (every 6h) → `POST /api/analyze` (admin-gated) →
  `runScheduledAnalysis` iterates `getSitesDueForAnalysis` → `analyzeSite` → `persistAnalysis` →
  alerts emailed + (new) webhook deliveries enqueued.

**Error propagation.** Providers throw → the job converts failures to DATA GAP (never stasis). API
routes return a stable JSON error envelope (`src/lib/api/errors.ts`). Webhook delivery failures are
retried from a durable outbox (§H). Metering/webhook emission are best-effort and never break the
request that triggered them.

---

## E. Database & data model

**Technology.** PostgreSQL (Neon) via Prisma 5.22. Schema: `prisma/schema.prisma`. Access is funneled
through `src/lib/db/repository.ts` (`SiteRepository`) — **do not** reach for `prisma` directly in
routes; add a repository method. The Prisma client is a singleton (`src/lib/db/client.ts`,
`getPrisma()` / `isDatabaseConfigured()`). [Verified] — this **supersedes** `ARCHITECTURE.md`'s
"persistence: spec only" line.

**Models (current):**

| Model | Purpose | Key relations / fields |
| --- | --- | --- |
| `User` | Account identity | `email` unique; → sites, subscriptions, apiKeys, usageRecords, webhookEndpoints |
| `Subscription` | Stripe subscription state | `stripeCustomerId`, `priceId`, `seats`, `drawIntelligenceSeats`, `state` |
| `Site` | A monitored site | `userId`, `geometryGeojson`, `status`, `stasisScore`, `confidence`, `loanNumber`, `drawIntelligence` |
| `SiteMember` | Shared access to a site | `siteId` + `userId` |
| `SiteObservation` | One satellite observation | `siteId`, `provider`, `observationDate`, `cloudPercent`, `qualityStatus`; → `SiteMetric` |
| `SiteMetric` | Indices for an observation | NDVI/NDBI/BSI, `siteChangePercent`, `changeVelocity`, `confidence` |
| `SiteAlert` | An emitted alert | `type`, `severity`, `idempotencyKey` (unique — dedupe backstop) |
| `AnalysisRun` | Audit of one evaluation | versions, provider, observation ids |
| `EmailEvent` | Email send audit | `to`, `type`, `delivered` |
| `ApiLog` | (internal logging model) | — |
| `SiteCheck` | The one-time $9 check | `token` unique, `email`, `paid`, result fields; **no `userId`** |
| `SiteMilestone` | CDI reported milestone vs evidence | `siteId`, reported stage, finding fields |
| `ApiKey` | Public API credential | `hashedKey` unique (SHA-256), `prefix`, `scopes[]`, `revokedAt` |
| `UsageRecord` | API usage/billing ledger | `operation`, `outcome`, `billableUnits`, `priceVersion` |
| `WebhookEndpoint` | Customer webhook target | `url`, `secretCipher` (AES-GCM), `events[]`, `active` |
| `WebhookDelivery` | Durable delivery outbox | `event`, `payload`, `status`, `attempts`, `nextAttemptAt` |

**Migrations.** `prisma/migrations/` — `20261026223124_api_keys_usage` and `20261027104747_webhooks`
are applied to production. Apply with `prisma migrate deploy` against the target `DATABASE_URL`;
generate the client with `prisma generate` (the Netlify build runs `prisma generate`, **not** migrate —
schema changes are a deliberate manual step).

> **[Risk] Dev and production currently share one Neon database** (endpoint `ep-shiny-boat-…`). A
> separate Neon **dev branch** exists; local `.env` must point at it before any migration or
> write-path testing, or local experiments hit production data. See §N and §M.

---

## F. Authentication, authorization & account ownership

There are **two** credential systems; keep them straight.

**1. Magic-link tokens (humans).** `src/lib/auth/magic-link.ts` — HMAC-SHA256 signed, short-lived
(`MAGIC_LINK_TTL_MINUTES`, default 30), rotatable (`MAGIC_LINK_SECRET` + `…_PREVIOUS`). Payload carries
`sub` (subject) + `scope`. Scopes in use: `account` (the whole account), and per-site scopes
(`site:read` / `site:workspace` / `site:create`).
- **Account sign-in:** `POST /api/magic-link` finds an **existing** user by email (no account
  enumeration — identical response either way), mints an `account`-scoped token, and emails
  `${APP_URL}/account?token=…`. `src/lib/account/session.ts` `verifyAccountToken()` is the gate:
  it returns a userId **only** for a valid `account`-scoped token. Per-site tokens are rejected
  there (unit-tested in `session.test.ts`). [Verified]
- **Per-site workspace links** (alerts, CDI) are minted elsewhere and are unaffected by the account flow.

**2. API keys (programmatic).** `src/lib/api/keys.ts` — `gs_live_` + 40 base62 chars; **only the
SHA-256 hash is stored** (`ApiKey.hashedKey`); the plaintext is shown once at creation. Scopes:
`checks:write`, `sites:read`, `sites:write`, `usage:read`, `webhooks:manage`. `src/lib/api/auth.ts`
`authenticate(request, requiredScope?)` resolves the key by hash, checks `revokedAt` and scope, and
best-effort stamps `lastUsedAt`. [Verified]

**Authorization.** Tenant isolation is enforced in the repository/store layer, not the UI: every
site/observation/check/key/webhook read is scoped by `userId` (the `SiteCheck` is scoped by **email
match** to the key owner, since it has no `userId` — [Verified], documented limitation in §G).

**Route classes.** Public: SEO pages, `GET /api/v1` + `/openapi.json`. Account-token: `/account`,
`/api/account/**`. API-key: `/api/v1/**` (except the public index). Admin-secret: `/admin`,
`POST /api/analyze`, `POST /api/cron/deliver-webhooks` (`ADMIN_SECRET` via `x-admin-secret`).

---

## G. API architecture & integrations

**Public REST API v1** — base `https://groundstasis.com/api/v1`, API-key auth (`Authorization:
Bearer gs_live_…` or `x-api-key`), stable JSON error envelope, rate-limited **60 req/min** per key
(ledger-counted in `src/lib/api/meter.ts`), every call written to `UsageRecord`. Shared scaffolding:
`src/lib/api/handler.ts` `handleRead()` (auth → rate-limit → load → meter, with `X-RateLimit-*`
headers). Response bodies are snake_case via `src/lib/api/serialize.ts` (pure, unit-tested).

| Method & route | Scope | Purpose |
| --- | --- | --- |
| `GET /api/v1` | none | Public discovery index |
| `GET /api/v1/openapi.json` | none | OpenAPI 3.1 spec (`src/lib/api/openapi.ts`) |
| `GET /api/v1/me` | any valid key | Account id + scopes (connection label for Zapier) |
| `GET /api/v1/sites` | `sites:read` | List sites; `?loan_number=` filter (CRM lookup) |
| `GET /api/v1/sites/{id}` | `sites:read` | One site (tenant-checked) |
| `GET /api/v1/sites/{id}/observations` | `sites:read` | Cursor-paginated observation history |
| `GET /api/v1/checks/{id}` | `sites:read` | One $9 check result (owned by **email match**) |
| `GET /api/v1/usage` | `usage:read` | Month-to-date usage + rate-limit headroom |
| `POST /api/v1/webhooks` | `webhooks:manage` | Subscribe an endpoint (Zapier REST Hook subscribe) |
| `GET /api/v1/webhooks` | `webhooks:manage` | List endpoints |
| `DELETE /api/v1/webhooks/{id}` | `webhooks:manage` | Unsubscribe (soft-disable) |

**Internal/account endpoints:** `/api/account/keys` (mint/list) + `/revoke`, `/api/account/webhooks`
(create/list) + `/disable` + `/test`, `/api/magic-link`, `/api/billing-portal`, `/api/checkout`,
`/api/stripe/webhook`, `/api/analyze`, `/api/cron/deliver-webhooks`, per-site `/api/site/[token]`,
`/api/check/[token]`, `/api/sites`.

**Integrations:** **Zapier** — a separate CLI app in `zapier-app/` (deploys to Zapier, not Netlify)
with API-key auth and five REST Hook triggers (new observation, stasis detected, activity resumed,
data gap, status changed) wired through `POST`/`DELETE /api/v1/webhooks`. Actions (add site, run check)
are **[Planned]** — they need `sites:write` endpoints + a metered-billing decision. **Native
Salesforce/Teams** are **[Planned]** (see `salesforce-integration.md`); API readiness (`?loan_number=`
lookup) is done.

---

## H. Webhooks & asynchronous processing

**Two provider webhooks/async systems. Keep them separate.**

**1. Inbound — Stripe webhook** (`POST /api/stripe/webhook`). Verifies the Stripe signature
(`STRIPE_WEBHOOK_SECRET`), and provisions **only** on `checkout.session.completed` — never before
confirmed payment. It also fires the server-side GA4 `purchase` (Decision D, §L). Idempotency uses
in-schema signals: `SiteCheck.paid` (first-payment flag) and the subscription "created" flag from a
prior `findUnique` — so a duplicate Stripe delivery doesn't double-provision or double-count the
purchase. [Verified by inspection; **[Runtime-verify]** against a real Stripe test event.]

**2. Outbound — Ground Stasis webhooks** (customer-facing). New this cycle.
- **Model:** `WebhookEndpoint` (url + AES-GCM-encrypted `secretCipher` + subscribed `events[]`) and a
  durable `WebhookDelivery` **outbox**.
- **Emission:** `src/lib/api/webhooks/emit.ts` — when a monitoring run inserts a **new** alert
  (`persistAnalysis` captures the inserted alerts via its create-closure, so duplicates never
  re-emit), it maps `alertType → event` (`events.ts`) and enqueues a delivery per subscribed active
  endpoint. Guarded with try/catch in `src/lib/jobs/run.ts` so a webhook failure **cannot** break a
  monitoring run.
- **Delivery worker:** `src/lib/jobs/deliver-webhooks.ts` `runWebhookDeliveries()` — claims due rows,
  **SSRF layer 2** (resolves the hostname and re-checks every resolved IP against the private/reserved
  blocklist in `ssrf.ts` before connecting), decrypts the secret, signs (`sign.ts`, Stripe-style
  `t=…,v1=…` HMAC header `X-GroundStasis-Signature`), POSTs with an 8s timeout, then records the
  outcome. Retries use exponential backoff (`delivery-policy.ts`, 30s→6h, max 6 attempts).
  **Delivery is at-least-once** — consumers dedupe on the `X-GroundStasis-Delivery` id.
- **Trigger:** `netlify/functions/scheduled-webhook-delivery.ts` (every minute) → admin-gated
  `POST /api/cron/deliver-webhooks`.
- **Security:** `src/lib/api/webhooks/ssrf.ts` layer 1 (reject non-https, credentials-in-URL,
  non-443 ports, localhost/internal names, private/reserved IP literals) + layer 2 (resolve-time IP
  recheck). [Verified; unit tests for sign/ssrf/secret-crypto/delivery-policy/events all pass in the
  isolated harness.]

---

## I. Stripe, products, billing & entitlements

**Source of truth:** `src/lib/billing/pricing.ts`. **Prices live in env vars** (the var *names* are in
code, the `price_…` *values* are server-side env), so one build works across test/live.

| Tier | id | Env var (price id) | Mode | Seats | Price |
| --- | --- | --- | --- | --- | --- |
| Single-site check | `check` | `STRIPE_PRICE_SITE_CHECK` | payment | 0 | $9 one-time |
| Foundation | `foundation` | `STRIPE_PRICE_ID` (legacy name) | subscription | 1 | $19/mo |
| Portfolio | `portfolio` | `STRIPE_PRICE_PORTFOLIO` | subscription | 3 | $49/mo |
| Pro | `pro` | `STRIPE_PRICE_PRO` | subscription | 10 | $99/mo |
| CDI add-on | — | `STRIPE_PRICE_DRAW_INTELLIGENCE` | per-site | — | $15/site/mo |

> **[Superseded]** `ENVIRONMENT.md` lists only `STRIPE_PRICE_ID` ($19/site). The current ladder is the
> four tiers + CDI above. [Verified] the code reads exactly these env var names: `STRIPE_PRICE_SITE_CHECK`,
> `STRIPE_PRICE_ID` (foundation — legacy name kept for back-compat), `STRIPE_PRICE_PORTFOLIO`,
> `STRIPE_PRICE_PRO`, `STRIPE_PRICE_DRAW_INTELLIGENCE`. **[Runtime-verify]** Confirm the Netlify
> dashboard has all five populated with the correct live `price_…` ids — a missing or wrong one means
> that tier can't be purchased, and `seatsForPriceId` fails safe to **1** seat for any price it does
> not recognize.

**Fulfillment.** Payment → `checkout.session.completed` webhook → provisioning. Subscriptions grant
seats via `seatsForPriceId()` (fail-safe: an unknown price grants **1** seat, never more). Sites are
created through `repository.createSite`, which enforces the seat entitlement via `getEntitlement()`.
The CDI add-on sets per-site `drawIntelligence` (clamped to the plan's seats). Customer self-service
(upgrade/cancel/card) is the **Stripe Customer Portal** via `POST /api/billing-portal` (reachable from
the account dashboard "Manage billing" button).

---

## J. Email, notifications & scheduled jobs

**Email.** `src/lib/email/` — a provider interface with `ConsoleEmailProvider` (default; logs the full
message to the server console — this is how you read magic links locally) and `ResendProvider`
(`EMAIL_PROVIDER=resend` + `EMAIL_API_KEY` + verified `EMAIL_FROM`). Templates in `templates.ts`; sends
are audited to `EmailEvent`. Postmark/SendGrid can be added behind the same interface. [Verified]

**Scheduled jobs (Netlify scheduled functions):**
- `scheduled-analysis` — every 6h (`0 */6 * * *`) → `POST /api/analyze` with `ADMIN_SECRET` →
  `runScheduledAnalysis`. Sentinel-2 yields few usable scenes/week, so 6h is intentional.
- `scheduled-webhook-delivery` — every minute (`* * * * *`) → `POST /api/cron/deliver-webhooks` →
  `runWebhookDeliveries`.

Both are thin triggers that call admin-gated internal routes (so the heavy logic stays out of the
function bundle and is testable). Verify a run via the Netlify **Function logs**.

---

## K. SEO, public tools & distribution

The public layer is the acquisition engine; the $9 check is the tripwire into paid.

- **Hub & pillars:** `/construction-loan-monitoring` (hub) + `/construction-lender-monitoring`,
  `/construction-loan-risk-monitoring`, `/satellite-construction-monitoring`,
  `/vet-monitor-builders-construction-lending-risk`.
- **Free tools** (`src/components/tools/*`, each with FAQ + Breadcrumb schema + a shared "New here?"
  `ToolFootnote`): escalation calculator, delay-cost calculator, monitoring-gap calculator, draw
  inspection form, **utility construction inspection form** (Tier 2), draw/monitoring checklists,
  and the free **activity check**. Index at `/tools`.
- **Programmatic geo pages:** `/construction-loan-monitoring/[location]` renders 12 market pages
  (New York, New England + 10 high-construction metros) from `src/lib/seo/locations.ts`
  (`generateStaticParams`, `dynamicParams = false`). Each has unique local content + the product
  pitch; linked from the hub and sitemap. **[Watch]** these are near-template — if they don't index
  or look thin, consolidate (doorway-page risk).
- **Developer SEO:** `/docs` (API docs incl. webhook signature verification), `/integrations/zapier`.
- **Config:** `src/app/sitemap.ts` (dynamic), `src/app/robots.ts`, canonical URLs per page, OG/brand
  assets in `public/brand/`, `/media-kit`.

SEO *configuration* is in the repo; *rankings/indexing* require external verification in Google Search
Console. Project docs `seo-roadmap.md` and `directory-kit.md` track status.

---

## L. Google Analytics 4 event dictionary

GA4 is injected in the root layout (`NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`, default `G-F1R30MC86L`). Client
events via `track()` in `src/lib/analytics.ts`. **Never** pass loan amounts, emails, addresses,
coordinates, magic-link tokens, or Stripe ids into event params (enforced by convention in the file).

**Commerce / funnel events** (`GA_EVENTS`): `landing_view`, `cta_click`, `checkout_started`,
`checkout_completed`, `site_setup_started`, `site_created`, `polygon_created`, `monitoring_started`,
`dashboard_view`, `evidence_view`, `alert_generated`, `alert_opened`, `site_check_started`,
`site_check_completed`, `site_report_viewed`, `draw_intelligence_offer_viewed/clicked`,
`monitoring_plan_selected`, `subscription_checkout_started/completed`, `draw_intelligence_enabled`,
`subscription_canceled`.

**SEO free-tool events** (consistent params `tool_name`, `tool_type`, `content_tier`, `page_path`):
`seo_tool_start`, `seo_tool_complete`, `seo_tool_validation_error`, `file_download`, `generate_lead`.
Helpers: `trackToolStart/Complete/ValidationError/FileDownload`.

**Verified server-side purchase (Decision D).** `src/lib/analytics-mp.ts` sends a GA4 **Measurement
Protocol** `purchase` from the Stripe webhook after confirmed payment (`GA4_API_SECRET`,
`transaction_id` = Stripe session id, value/currency from the session). The visitor's GA4 `client_id`
is captured at checkout (`getGaClientId()` — gtag, falling back to the `_ga` cookie) and carried
through Stripe metadata. If no client_id, the purchase is **skipped, never faked**. Idempotent via the
in-schema first-payment/created flags. [Verified by inspection; **[Runtime-verify]** in GA4 DebugView.]

> **[Runtime-verify]** A tracking call in code does **not** prove the event arrives in GA4. Confirm in
> GA4 Realtime/DebugView, and confirm which events are marked **key events/conversions** (that's
> configured in the GA4 UI, not the repo).

---

## M. Deployment, configuration & environments

**Deploy (correct path): Git-connected Netlify CI.** Push to GitHub → Netlify builds on its Linux CI
(`npm run build` → `prisma generate && next build`, with `@netlify/plugin-nextjs` v5) → deploy. Env
vars live in the Netlify dashboard; the build uses those (not any local `.env`).

> **[Important] Do not deploy this app with `netlify deploy` from the Windows CLI.** It was observed
> to build successfully but publish Next v5 routing incorrectly, 404-ing every route. Drag-and-drop
> is static-only and also won't work (no serverless functions). Use Git-connected CI, or roll back in
> the Netlify dashboard (Deploys → a known-good deploy → Publish deploy) to restore instantly.

**Environment variables (current).** See `ENVIRONMENT.md` for the base set; this handbook adds the
vars introduced since:

| Variable | Needed for | Notes |
| --- | --- | --- |
| `GA4_API_SECRET` | server-side `purchase` (Decision D) | GA4 Admin → Data Streams → Measurement Protocol API secrets. **Server-only, never `NEXT_PUBLIC`.** |
| `WEBHOOK_ENC_KEY` | encrypting webhook signing secrets | AES-256-GCM key. **Never rotate once endpoints exist** (existing secrets become undecryptable). |
| `STRIPE_PRICE_SITE_CHECK` | $9 check | one-time price id |
| `STRIPE_PRICE_PORTFOLIO` / `STRIPE_PRICE_PRO` | $49 / $99 tiers | subscription price ids |
| `STRIPE_PRICE_DRAW_INTELLIGENCE` | CDI add-on | per-site price id |

Plus the base set: `APP_URL`, `DATABASE_URL`, `SATELLITE_PROVIDER` + `SENTINELHUB_*`,
`STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID`/`STRIPE_WEBHOOK_SECRET`, `EMAIL_*`, `MAGIC_LINK_SECRET`(+`_PREVIOUS`/`_TTL_MINUTES`),
`ADMIN_SECRET`, `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`.

**Environments.** Production builds on Netlify with prod env. Local dev uses a local `.env` — **which
must point at the Neon dev branch**, not prod (dev/prod share a DB today). Local sign-in needs
`APP_URL=http://localhost:3000` (or the emailed link points at the live site) and a local
`MAGIC_LINK_SECRET`. The console email provider prints magic links to the `npm run dev` terminal.

---

## N. Security, privacy & data integrity

**Confirmed-good:** API-key hashing (store only SHA-256); magic-link signing + expiry + rotation;
account/site tenant isolation in the repository layer; Stripe webhook signature verification; webhook
SSRF guard (two layers) + encrypted signing secrets at rest; GeoJSON validation; no secrets
client-side; private site data served `noindex` and kept out of URLs; the DATA-GAP integrity rule.

**Risks to track:**
- **[Risk] Shared dev/prod database.** Use the Neon dev branch for local work; never run migrations or
  write-path tests against prod `.env`. (A local build that reads a dev `.env` must not be deployed —
  use CI.)
- **[Risk] No app-level rate limiting on `/api/magic-link`.** The public API is rate-limited (ledger),
  but the sign-in endpoint relies on the no-enumeration response; add edge/middleware rate limiting in
  production.
- **[Runtime-verify] Stripe idempotency & GA4 purchase** under real duplicate deliveries.
- **[Note] Webhook delivery is at-least-once** by design — consumers must dedupe on delivery id.
- **[Watch] Geo/doorway pages** — keep them substantive.

Rank before acting: shared DB (highest), then magic-link rate limiting, then the runtime verifications.

---

## O. Troubleshooting runbooks

Each: symptom → likely cause → where to look → safe fix → verify.

1. **Whole site 404s after a deploy.** → Deployed via the Windows Netlify CLI (v5 routing not
   published). → Netlify Deploys list. → **Roll back** to a known-good deploy (Publish deploy), then
   deploy via Git-connected CI. → `/` and `/api/v1` return content.
2. **Satellite provider auth/API failure.** → CDSE creds/quota. → `sentinelhub-provider.ts` logs;
   `capabilities()` in `env.ts`. → Falls back to demo if unconfigured; fix creds. A failure must show
   as DATA GAP, never stasis. → Run `scripts/validate-cdse.mjs`.
3. **No usable observations / unexpected DATA GAP.** → Clouds or `maxDaysSinceUsableObservation`
   exceeded. → `analysis/config.ts` thresholds + the observation's `qualityStatus`. → Expected
   behavior, not a bug; wait for a clear pass.
4. **Magic-link sign-in shows nothing locally.** → `APP_URL` not localhost, or the email isn't a `User`
   row, or `MAGIC_LINK_SECRET` unset. → §F, §M. → Set `APP_URL=http://localhost:3000`, add a user via
   `npx prisma studio`, set a local secret; link prints in the dev terminal.
5. **Stripe payment didn't provision.** → Webhook not received/verified. → `/api/stripe/webhook`;
   Stripe dashboard → webhook deliveries. → Confirm `STRIPE_WEBHOOK_SECRET`; provisioning only fires on
   `checkout.session.completed`. → Check the `Subscription`/`SiteCheck` row.
6. **Webhook not delivered.** → `WEBHOOK_ENC_KEY` unset, endpoint inactive/invalid URL, or SSRF-blocked.
   → `WebhookDelivery.status`/`attempts`; Netlify function logs for `scheduled-webhook-delivery`. →
   Fix endpoint; retries resume automatically.
7. **Monitoring job didn't run.** → Scheduled function error / `APP_URL`/`ADMIN_SECRET`. → Netlify
   function logs. → Re-trigger `POST /api/analyze` manually with the admin secret.
8. **Missing/duplicate GA4 events.** → Consent, ad-blockers, or the event not marked a key event. →
   GA4 DebugView. → Verify in the GA4 UI (runtime only).

Never run destructive DB commands or apply migrations against production without a backup, an
environment check, and an explicit decision.

---

## P. Junior developer onboarding

1. Read `README.md`, `ARCHITECTURE.md`, `ALGORITHM.md`, `SATELLITE_DATA.md`, then this handbook §A–§E.
2. `npm install`.
3. Create a local `.env` from `.env.example`: point `DATABASE_URL` at the **Neon dev branch**, set
   `APP_URL=http://localhost:3000`, a local `MAGIC_LINK_SECRET`, `WEBHOOK_ENC_KEY`. Leave
   `SATELLITE_PROVIDER` unset (demo) to start.
4. `npx prisma generate`, then `npm run dev`. The app runs in demo mode with an empty-ish env.
5. Trace a check: open `/construction-activity-check`, follow `CheckFlow` → `/api/checkout`.
6. Trace fulfillment: read `/api/stripe/webhook` with Stripe test mode + a test price.
7. Trace auth: `POST /api/magic-link` with a user's email → grab the link from the terminal →
   `/account`.
8. Trace monitoring: read `runScheduledAnalysis` in `src/lib/jobs/run.ts`.
9. Make a small change (e.g., a tool's copy), run `npm run lint` + `npm test` + `npm run build`.
10. Commit, push — Netlify CI deploys. Verify on the deploy's URL.

Tests: `npm test` (vitest). The analysis engine, api libs, and webhook libs have unit tests.

---

## Q. FAQ

- **Where does satellite data come from?** CDSE Sentinel-2 L2A via the Statistical API (§C).
- **What does a status mean?** A 0–100 stasis score bucketed ACTIVE/WATCH/REVIEW/STASIS, with
  protective overrides; low confidence caps STASIS to REVIEW (§C, `ALGORITHM.md`).
- **Why might there be no recent observations?** Clouds/revisit — reported as DATA GAP, never
  inactivity.
- **Where's the analysis logic?** `src/lib/analysis/` (pure).
- **Where are users/sites stored?** Postgres via Prisma; access through `src/lib/db/repository.ts`.
- **How does auth work?** Magic-link tokens for humans, API keys for programs (§F).
- **How does a $9 check become a report?** `/api/checkout` → Stripe → webhook marks paid → `analyzeSite`
  → result on `SiteCheck` → emailed `/check/[token]`.
- **How does a subscription activate?** Webhook `recordStripeSubscription` grants seats (fail-safe to 1).
- **What if Stripe sends a webhook twice?** In-schema first-payment/created flags make provisioning +
  the GA4 purchase idempotent (§H, §L) — **[Runtime-verify]**.
- **How are monitoring checks triggered?** `scheduled-analysis` every 6h → `/api/analyze`.
- **How do I add a GA4 event?** Add to `GA_EVENTS` and call `track()` (§L).
- **How do I add an SEO page/tool?** New `src/app/<slug>/page.tsx` (+ a `components/tools/*`), add to
  `sitemap.ts`, cross-link.
- **How do I change pricing safely?** Edit `src/lib/billing/pricing.ts` + set the matching Stripe price
  id env vars; never hardcode `price_…`.
- **Which operations are unsafe in production?** Migrations against prod `.env`, deploying a locally
  built `.env`, the Windows Netlify CLI deploy, rotating `WEBHOOK_ENC_KEY`.

## R. Known gaps & handoff priorities

**Mandatory / high:**
1. Separate dev and prod databases properly (use the Neon dev branch consistently; stop sharing).
2. Confirm the Netlify dashboard has all five Stripe price env vars populated with live `price_…`
   ids (`STRIPE_PRICE_SITE_CHECK`, `STRIPE_PRICE_ID`, `STRIPE_PRICE_PORTFOLIO`, `STRIPE_PRICE_PRO`,
   `STRIPE_PRICE_DRAW_INTELLIGENCE`) — the code reads these exact names.
3. Runtime-verify Stripe fulfillment + the GA4 `purchase` against real test events.
4. Add rate limiting to `/api/magic-link` (and ideally all public POSTs) at the edge.

**Should do:**
5. Validate the CDSE Statistical API response parser against a live response.
6. Confirm the geo/[location] pages index well; consolidate if thin.
7. Update `ARCHITECTURE.md`/`ENVIRONMENT.md` or redirect them to this handbook (they're stale on
   persistence + pricing).

**Planned (not built):** Zapier actions (add site / run check); native Salesforce (AppExchange) +
Teams; API metered billing (the `UsageRecord` ledger already instruments it — flip on a Stripe metered
price when a paying developer appears).

---

*End of handbook. A matching standalone, brand-styled HTML version lives at
`docs/GROUNDSTASIS_TECHNICAL_HANDBOOK.html`. Keep the two synchronized when you edit.*
