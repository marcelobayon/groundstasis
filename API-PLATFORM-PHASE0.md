# Ground Stasis — API Platform: Phase 0 Audit & Plan

**Status: audit only. No code changed, nothing deployed. Awaiting approval before Phase 1.**
Date 2026-10-26. Scope: the master API-first expansion prompt. Read §12 (Decisions) first.

---

## 0. Headline findings

1. **The shared analysis service already exists.** `src/lib/jobs/analyze-site.ts` → `analyzeSite()` is the single orchestration unit (fetch observations → evaluate → decide alerts → email), already reused by the scheduled loop (`lib/jobs/run.ts`) and the demo path. The pure engine is `lib/analysis` (`evaluateSite`, `decideAlerts`). **The API can call this directly — no second scoring engine, exactly as the prompt demands.**
2. **Production may still be in demo mode.** The app runs with zero config in demo mode; real analysis needs `DATABASE_URL` (Postgres) + `SATELLITE_PROVIDER=sentinelhub` + CDSE credentials, and `prisma migrate`. **I can't see prod env from here — confirming this is gating item #1.** If prod is demo, an API has no real data to serve and the priority is turning the core product on, not building an API.
3. **No durable job queue.** Analysis is synchronous (inside a request, or the 6-hour scheduled function). Netlify functions are ephemeral. The API's async `POST /checks` needs a DB job table + a frequent drainer — the hardest, highest-risk piece.
4. **Several prompt items are already built** (this/last session): server-side GA4 purchase (Decision D), Tier-1 SEO graph + `/construction-loan-monitoring` hub, media kit. Don't rebuild them.

---

## 1. Existing system architecture

Next.js 14.2.35 App Router (`src/app`), TypeScript strict, Prisma/Postgres, Netlify (`@netlify/plugin-nextjs`) + one scheduled function. Layers today:

- **HTTP:** App Router pages + `/api/*` route handlers.
- **Domain services:** `lib/jobs/analyze-site.ts` (orchestration), `lib/analysis/*` (pure engine: indices → change → baseline → score → status, versioned), `lib/cdi/*` (reported-vs-observed), `lib/geo/*` (polygon validate/area/suitability).
- **Providers (swappable):** `lib/satellite/*` (DemoProvider | SentinelHubProvider/CDSE), `lib/email/*` (console | Resend), `lib/billing/*` (Stripe).
- **Persistence:** `lib/db/repository.ts` (`SiteRepository`) over Prisma. Runs demo with no DB.
- **Auth:** magic-link (signed, scoped tokens) for customers; `ADMIN_SECRET` for the internal analyze endpoint.

## 2. Data flow

- **$9 check:** checkout → Stripe webhook marks `SiteCheck.paid` → buyer enters site on `/check/[token]` → one synchronous `analyzeSite()` run → `saveSiteCheckResult` → secure results page + email. One live satellite read, never enters the monitoring loop.
- **Monitoring:** subscription webhook provisions `User`+`Subscription` → setup link → `POST /api/sites` (magic-link, entitlement-enforced) creates `Site` → scheduled function (every 6h) → `/api/analyze` → `runScheduledAnalysis` loops due sites → `analyzeSite()` each → `persistAnalysis` → alert emails + CDI findings.
- **Idempotency today:** alert dedup via `SiteAlert.idempotencyKey`; provider failure degrades to DATA_GAP, never Stasis.

## 3. Database entities (all present)

`User, Subscription, Site, SiteMember, SiteObservation, SiteMetric, SiteAlert, EmailEvent, AnalysisRun, ApiLog, SiteCheck, SiteMilestone`. Tenant = `User`; `Site.userId` + `getEntitlement()` already enforce ownership/seat limits server-side.

**Already useful for the API:** `ApiLog` (route/method/status/duration) — a thin request log to grow into usage metering. **Missing (all additive, new tables): `ApiKey`, a billing-grade `UsageRecord`, `WebhookEndpoint`, `WebhookDelivery`, an `Event`/outbox, and a durable `Job`/`CheckJob`** (the API's async unit; `SiteCheck` is close but welded to the $9 web flow).

## 4. Reusable services (reuse, don't rebuild)

`analyzeSite()` (orchestration) · `evaluateSite()`/`decideAlerts()` (engine) · `SiteRepository` (data + entitlements) · `getSatelliteProvider()` (CDSE boundary — the cost center) · `lib/billing` (Stripe) · `lib/email` · `lib/geo` · magic-link signing. The API is a thin authenticated/metered layer **in front of** these.

## 5. Routes & collision check

Existing `/api/*`: `analyze, billing-portal, check/[token], checkout, magic-link, site/[token], sites, stripe/webhook`. **`/api/v1/*` is collision-free.** `/api/v1/sites` (api-key) coexists with `/api/sites` (magic-link) — keep both; do not repoint the web app.

## 6. Auth & authorization boundaries

Customers: scoped magic-link tokens (`site:create`, `site:read`). Internal: `ADMIN_SECRET` header. **The API needs a new, separate API-key mechanism** (hashed storage, show-once, named, revocable, scoped, per-key rate limits), mapped to a `User` (tenant). Reuse `node:crypto` (already used for tokens). Tenant isolation goes at the repository/service boundary (it already keys on `userId`).

## 7. Billing & entitlements

Stripe checkout + webhook provisioning + portal; `Subscription` + `getEntitlement()` enforce seats/CDI server-side; the verified GA4 `purchase` now fires from the webhook (Decision D). **API billing is net-new** and should stay decoupled from the engine: a usage ledger + configurable API pricing (not hardcoded). New API Stripe products/prices are a later, explicit step — **not** in the MVP.

## 8. Async jobs & retries — the core gap

Today: no queue; `analyzeSite` runs synchronously; the scheduled function is a thin 6-hour trigger. Fine for one $9 check per request and a slow monitoring loop; **wrong for an API** that can receive many concurrent `POST /checks`.

**Recommended (simplest Netlify-native, no new infra):** a `CheckJob` table (states: `queued|running|completed|failed|cancelled`, attempts, backoff, idempotency key) + a **scheduled drainer function at 1-minute cadence** (Netlify cron min is 1 min) that claims and runs queued jobs through `analyzeSite`, with max-retries + terminal-failure handling. `POST /checks` writes a `queued` job and returns `202 + job id`; `GET /checks/{id}` polls; webhooks (Phase 2) push completion. Alternative: Netlify **background functions** (`*-background`, ≤15 min) invoked on enqueue — lower latency, slightly more moving parts. Either reuses `analyzeSite` unchanged. **Tradeoff to accept:** up to ~1 min queue latency with the drainer (fine — satellite data isn't real-time).

## 9. Tests & deployment checks

`vitest` (93 tests pass on your machine), `tsc --noEmit`, `next lint`, `prisma generate && next build`, Netlify deploy. New work must extend this suite (the prompt's §17 matrix). No destructive migrations; additive only.

## 10. Technical debt & security risks

- **Demo-vs-prod ambiguity** (gating item #1).
- **No rate limiting yet** (the magic-link route notes it "should wrap at the edge/middleware") — a hard requirement before any public API.
- **No SSRF protection** (needed for customer webhook URLs: block private/loopback/link-local/metadata).
- `ApiLog` is a log, not an auditable billing ledger — don't bill off it as-is.
- CDSE cost is unmeasured — each new analysis = OAuth + Statistical API call(s) + compute. **Unit economics unknown.**
- `SiteCheck` is coupled to the $9 web flow; generalize carefully rather than overloading it for API checks.

## 11. Proposed API v1 contract (maps to existing domain)

Reads (cheap, reuse persisted data): `GET /api/v1/sites`, `GET /api/v1/sites/{id}`, `GET /api/v1/sites/{id}/observations` (paginated), `GET /api/v1/checks/{id}`, `GET /api/v1/usage`. Writes: `POST /api/v1/checks` (async → 202 + job id; quota + idempotency-key enforced), `POST /api/v1/sites` (entitlement-gated). Webhooks (Phase 2): `GET/POST/DELETE /api/v1/webhooks`. Stable JSON result contract from the existing `SiteEvaluation` (status, stasis_score, confidence, last_usable_observation, baseline_established, algorithm_version, thresholds_version, warnings), UTC timestamps, **job status ≠ activity status**, data-gap never Stasis. OpenAPI 3.x generated from the real routes; nothing documented before it exists + passes tests.

## 12. Minimal DB additions (all additive migrations)

`ApiKey` (hash, prefix, name, scopes[], userId, lastUsedAt, revokedAt) · `CheckJob` (status, attempts, idempotencyKey, siteId/input, resultRef, error, timestamps) · `UsageRecord` (userId, apiKeyId, operation, idempotencyKey, outcome, billableUnits, priceVersion, period, createdAt) · later: `WebhookEndpoint`, `WebhookDelivery`, `Event` (outbox). No changes to existing models' columns in the MVP.

## 13. Phased plan (gated)

- **Phase 1a — API foundation + reads (smallest safe slice):** `ApiKey` model + dashboard issuance (hashed, show-once, scopes, revoke) + verification middleware + per-key rate limiting + `UsageRecord`; implement the **read** endpoints (`sites`, `sites/{id}`, `observations`, `usage`) over existing data (zero new analysis cost); OpenAPI + `/docs` for these. Acceptance: key auth, tenant isolation, scope enforcement, rate limits, pagination, usage rows — all tested.
- **Phase 1b — async checks:** `CheckJob` + drainer; `POST /api/v1/checks` (202 + id) and `GET /checks/{id}` reusing `analyzeSite`; metering that never charges a failed/duplicate as success. Acceptance: idempotency, no duplicate jobs/charges, provider-failure ≠ success, data-gap ≠ Stasis.
- **Phase 2 — webhooks:** event outbox + `WebhookEndpoint`/`WebhookDelivery`, HMAC signatures, retries/backoff, SSRF guards, delivery history. 
- **Phase 3 — SEO:** Tier-1 is live; add Tier-2/3 **from GSC demand**, not speculatively.
- **Phase 4 — distribution:** Zapier (reuses API + webhooks) first; Salesforce/Teams on evidence; browser extension later.

Each phase: scope → migration-risk → smallest increment → tests → run suite → diff review → docs → approval before the next.

## 14. Conflicts between the prompt and the repo

- **GA4 ID:** prompt says `G-F1R30MC86C`; the repo/live config is `G-F1R30MC86L` (ends **L**). Using the repo value.
- **Purchase event:** prompt lists `purchase_completed`; Decision D already ships the GA4-standard ecommerce `purchase` server-side. Recommend keeping `purchase` (standard) rather than a non-standard alias.
- **SEO §14 largely done:** hub + Tier-1 calculators/pillar/form exist; "create these tools" is mostly satisfied — avoid duplicates.
- **Volume API pricing** ($25/1k, $150/10k, $750/100k): premature. Those imply steep discounts only viable for *reading cached results*, not new satellite analyses. Separate "read result" (cheap) from "new analysis" (CDSE+compute) in pricing, and measure cost-per-completed-analysis first.
- **"Self-service revenue with minimal sales":** sound, but gated on prod being live and on real developer demand, which isn't evidenced yet.

## 15. Smallest safe recommendation

1. **Confirm prod is live** (DB + CDSE + migrations). If not, do that first — it's a prerequisite to everything here and to the $9/subscription flows actually working.
2. Build **Phase 1a only** (keys + reads + usage) — low risk, zero new analysis cost, lets a developer authenticate and read real data.
3. Measure **cost-per-completed-analysis** before Phase 1b pricing.
4. Hold Phases 2–4 until a real first integration/customer justifies them. Keep the internal service enterprise-ready, but don't build an enterprise portal on spec.
