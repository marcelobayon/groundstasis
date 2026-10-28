# Ground Stasis — SEO Roadmap Implementation Blueprint

**Phase 0 deliverable.** Status: awaiting approval. No production code has been modified.
Author: Claude (senior technical SEO / full-stack). Date: 2026-10-21.
Source of truth: `ground-stasis-seo-content-roadmap.md`, `ground-stasis-directory-listing-kit.md`, and the live repo.

> Read §10 first. Four decisions gate implementation; the rest of this document assumes the **recommended** option for each.

---

## 1. Current-state inventory

**Stack.** Next.js `14.2.35` (App Router, `src/app`), React 18.3.1, TypeScript strict, `@/* → ./src/*`. Build: `prisma generate && next build`. Tests: `vitest` (`src/**/*.test.ts`). Deploy: Netlify + `@netlify/plugin-nextjs`, `publish=".next"`, Node 20. Scheduled fn `netlify/functions/scheduled-analysis.ts` (every 6h). The app runs fully in **demo mode** with no env keys.

**Public routes (indexable).**
| Route | Type | Notes |
|---|---|---|
| `/` | landing | Hero, problem, pricing (`PricingSection`), FAQ + FAQPage JSON-LD already inline |
| `/tools` | index | Hard-coded `TOOLS` array — **must be edited to list new tools** |
| `/construction-loan-monitoring-checklist` | checklist | existing resource |
| `/construction-draw-inspection-checklist` | checklist | existing resource |
| `/construction-delay-cost-calculator` | calculator | **Tier 1 #4: optimize in place** |
| `/construction-monitoring-gap-calculator` | calculator | existing resource |
| `/construction-activity-check` | interactive | $9 funnel bridge (`ActivityCheck`) |
| `/construction-lender-monitoring` | guide (prose) | **cannibalization cluster** (see §10-A) |
| `/construction-loan-risk-monitoring` | guide (prose) | **cannibalization cluster** |
| `/satellite-construction-monitoring` | guide (prose) | **Tier 3 lists this as "new" — it EXISTS → update in place** |
| `/construction-draw-intelligence` | product (CDI) | protected product page |
| `/methodology`, `/privacy`, `/terms` | static | — |

**Private/app routes (correctly noindex).** `/check/[token]`, `/site/[token]`, `/s/[token]` — all set per-page `robots:{index:false,follow:false}`. `/demo`, `/admin`, `/setup` — noindex via `next.config.mjs` `X-Robots-Tag` header (`/(demo|admin|dashboard)`) and/or robots.ts. API under `/api/*`.

**Shared components to reuse (do not duplicate).** `components/chrome.tsx` (`Nav`, `Footer`), `components/cta.tsx` (`CtaButton` — fires `track()`), `components/seo-cta.tsx` (`SeoCta`), `components/tools/ToolCta.tsx` (funnel block), `components/pricing-section.tsx`, `components/pageview.tsx`. Calculator pattern = pure math in `lib/tools/calc.ts` (unit-tested) + client component in `components/tools/*` + thin page in `app/<slug>/page.tsx` with `metadata{title,description,alternates.canonical}` + `<h1>` + lead + tool + `ToolCta`.

**Analytics (live).** GA4 `G-F1R30MC86L` via `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`. `components/Analytics.tsx` loads gtag afterInteractive; `route-analytics.tsx` sends SPA `page_view` (skips first to avoid double-count); `lib/analytics.ts` exports typed `track()` + `GA_EVENTS` catalogue. **Existing event names:** `cta_click`, `checkout_started`, `subscription_checkout_started`, `checkout_completed`, `subscription_checkout_completed`, `draw_intelligence_offer_viewed/clicked`, `monitoring_plan_selected`, etc.

**Protected integrations (treat as infrastructure).**
- **Stripe** — `lib/billing/{index,provider,stripe-provider,pricing}.ts`; `/api/checkout` opens sessions; `/api/stripe/webhook` is the *only* place payment → provisioning. Value ladder in `lib/billing/pricing.ts`: `check` $9 one-time (`STRIPE_PRICE_SITE_CHECK`), `foundation` $19/1 (`STRIPE_PRICE_ID`), `portfolio` $49/3 (`STRIPE_PRICE_PORTFOLIO`), `pro` $99/10 (`STRIPE_PRICE_PRO`), CDI add-on $15/site (`STRIPE_PRICE_DRAW_INTELLIGENCE`). Price IDs live in env only.
- **CDSE/satellite** — `lib/satellite/{index,provider,demo-provider,sentinelhub-provider,types}.ts`; Copernicus Sentinel-2 Statistical API; demo provider default.
- **Entitlements / auth** — Prisma (`prisma/schema.prisma`: User/Subscription/Site/SiteMember/Observation/Metric/Alert…); magic-link (`lib/auth/magic-link.ts`); `lib/db/repository.ts` enforces seats server-side via `getEntitlement()`; CDI per-site in `lib/cdi/*`.
- **Email** — `lib/email/*` (console default, Resend adapter).

**Existing tests.** `calc.test.ts`, `pricing.test.ts`, `stripe.test.ts`, `magic-link.test.ts`, `findings.test.ts`, `analyze-site.test.ts`, `idempotency.test.ts`, `repository.test.ts`.

**Docs convention.** Root-level ALL-CAPS `.md` (README, ARCHITECTURE, APPLY*, TESTING…). No `docs/` dir → this blueprint lives at repo root as `SEO-ROADMAP-IMPLEMENTATION.md`.

---

## 2. Route-by-route mapping

Legend: **NEW** = create · **EDIT** = update in place (preserve URL + function) · **DECISION** = see §10.

| Roadmap page | Action | Reality check |
|---|---|---|
| **T1** `/construction-escalation-calculator` | NEW calc | no conflict |
| **T1** `/vet-monitor-builders-construction-lending-risk` | NEW pillar | differentiate from the two monitoring guides; cross-link |
| **T1** `/construction-draw-inspection-form` | NEW template | complements existing draw-inspection *checklist* |
| **T1** `/construction-delay-cost-calculator` | EDIT | retarget title/H1/intro to "calculating construction delay costs"; add FAQ + links; keep `DelayCostCalc` + URL |
| **T1** `/construction-loan-monitoring` | **DECISION-A** | exact slug absent, but 2 close cousins exist → cannibalization |
| **T2** `/construction-loan-interest-reserve-calculator` | NEW calc | §4 |
| **T2** `/construction-contingency-reserve-calculator` | NEW calc | §4 |
| **T2** `/construction-cost-to-complete-calculator` | NEW calc | §4 (financial ≠ physical) |
| **T2** `/retainage-calculator` | NEW calc | §4 |
| **T2** `/construction-draw-schedule-calculator` | NEW calc | §4 |
| **T2** `/how-often-should-construction-loans-be-inspected` | NEW content | — |
| **T2** `/stalled-construction-project-warning-signs` | NEW content | link gap-calc, activity-check, $9 |
| **T2** `/fund-control-vs-construction-loan-monitoring` | NEW content | no competitor claims |
| **T2** `/construction-draw-request-template` | NEW template | keep requested/reported/observed/approved distinct |
| **T3** `/what-is-construction-loan-monitoring` | NEW (spoke) | **DECISION-A** — definitional spoke pointing to the hub |
| **T3** `/what-is-a-construction-draw-inspection` | NEW content | link draw-inspection checklist + new form |
| **T3** `/satellite-construction-monitoring` | **EDIT** | already exists — expand, do NOT create a duplicate |

---

## 3. Content architecture & internal-linking plan

**Principle:** hub-and-spoke, not link-everything-to-everything. Reuse existing resources as network nodes; never remove them.

**Global (once).** Add a "Free tools" footer column in `chrome.tsx` linking the tools index + core calculators, and a "Product" column (Home, Pricing `/#pricing`, $9 check, CDI). The homepage's `1 internal link` problem resolves the moment the footer links Home from every page. Keep `Nav` as-is (already has Free tools + Pricing + $9 CTA).

**Clusters & contextual links:**
- **Monitoring hub** (DECISION-A target) ← `/what-is-construction-loan-monitoring`, `/construction-lender-monitoring`, `/construction-loan-risk-monitoring`, `/satellite-construction-monitoring`, `/stalled-construction-project-warning-signs`. Hub → `/#pricing` + $9 check.
- **Draw cluster:** `/construction-draw-inspection-checklist` ↔ `/construction-draw-inspection-form` ↔ `/what-is-a-construction-draw-inspection` ↔ `/construction-draw-request-template`; all → $9 check / monitoring.
- **Cost/number cluster:** `/construction-delay-cost-calculator` ↔ escalation ↔ interest-reserve ↔ contingency ↔ cost-to-complete ↔ retainage ↔ draw-schedule; each → the monitoring hub + $9.
- **Funnel spine (unchanged):** checklist → gap-calc → $9/monitoring; activity-check → $9 full report; delay-cost → monitoring + $9.
- `/fund-control-vs-construction-loan-monitoring` → monitoring hub + CDI page.

**CTA rule (inherited from `ToolCta`):** free tool *teaches* the problem; Ground Stasis *watches* it. Every new page gets one primary CTA (to `/#pricing` or the $9 check via `/construction-activity-check`) and 1–2 contextual sibling links.

---

## 4. Calculator formula specifications

All calcs: pure functions added to `lib/tools/calc.ts` (or a new `lib/tools/finance.ts` if it grows large), unit-tested in `calc.test.ts`; UI in `components/tools/<Name>.tsx` mirroring `GapCalc`/`DelayCostCalc`. **Standards:** labeled currency/percent; validation errors (never silent clamping — negatives/invalid show a message, consistent with roadmap); explicit assumptions + worked example; `Reset`; keyboard/screen-reader accessible; no backend; **user financial inputs never sent to GA4**.

**4.1 Escalation** `/construction-escalation-calculator`
Inputs: `baseCost` (USD≥0), `annualRatePct` (≥0), `period` (months or years, user unit), `mode` ∈ {compound (default), simple}.
Formula: `t = years`; compound `projected = base·(1+r)^t`; simple `projected = base·(1+r·t)` where `r = annualRatePct/100`.
Outputs: `projected`, `increase = projected−base`, `pctIncrease = base>0 ? (projected/base−1)·100 : 0`.
Disclose: rate is annual; compounding basis stated; **a generalized estimate, not a contractor quote or guaranteed future cost**.
Edge: base=0 → all 0; rate=0 → projected=base; fractional periods ok (18mo = 1.5y); negative/NaN → validation error; guard overflow → show "—".
Tests: (1,000,000, 6%, 2y, compound)→1,123,600 / +123,600 / 12.36%. simple→1,120,000. (x,0%,ny)→x. (0,…)→0.

**4.2 Interest reserve** `/construction-loan-interest-reserve-calculator`
Inputs: `loanCommitment`, `annualRatePct`, `termMonths`, `avgOutstandingPct` (default 50%, explained as the average-balance approximation), optional `reserveFundedToDate`.
Formula: `avgBalance = commitment·avgOutstandingPct/100`; `monthlyInterest = avgBalance·(rate/100)/12`; `estimatedReserve = monthlyInterest·termMonths`; `remaining = reserveFunded − estimatedToDate` (only if provided).
Disclose: fixed vs average-balance assumption stated; **not a lender's servicing ledger**.
Edge: 0s → 0; pct>100 or negatives → error.
Test: (1,000,000, 10%, 12, 50%) → reserve 50,000; monthlyInterest ≈ 4,166.67.

**4.3 Contingency reserve** `/construction-contingency-reserve-calculator`
Inputs: `eligibleHardCosts`, `contingencyPct` (default 10%, explained), optional `softCosts`.
Formula: `contingency = hardCosts·pct/100`; `totalWithContingency = hardCosts + softCosts + contingency`.
Disclose: contingency ≠ a lender's required reserve policy; cost basis shown.
Edge: pct 0 → 0; negatives/pct>100 → error.
Test: (2,000,000, 10%) → 200,000; total 2,200,000.

**4.4 Cost-to-complete** `/construction-cost-to-complete-calculator`
Inputs: `totalBudget`, `costsIncurred`, optional `committedNotPaid`, optional `reportedPhysicalPct`.
Formula: `costToComplete = max(0, budget − incurred − committed)`; `financialPctSpent = incurred/budget·100`. If `reportedPhysicalPct` given, show **both** + note divergence (spend ahead of/behind reported progress) as *informational flag, not proof*.
Disclose: **financial CTC ≠ physical % complete; never infer physical completion from spend or imagery**.
Edge: incurred>budget → CTC 0 + visible "over budget by $X"; negatives → error.
Test: (1,000,000, 600,000) → CTC 400,000, spent 60%.

**4.5 Retainage** `/retainage-calculator`
Inputs: `eligibleBase` (work completed $), `retainagePct` (default 10%, explained), optional `previouslyReleased`, optional `requestedReleaseNow`.
Formula: `withheld = eligibleBase·pct/100`; `potentialRelease` only from explicit user assumptions (`requestedReleaseNow`), bounded by `withheld − previouslyReleased`.
Disclose: **not legally due or approved for release**; partial release per user's stated assumptions only.
Edge: pct 0–100 (else error); negatives → error.
Test: (500,000, 10%) → withheld 50,000.

**4.6 Draw schedule** `/construction-draw-schedule-calculator`
Inputs: `budget` + rows `{description, amount | pct, targetDate}`.
Formula: per-row amount (from pct if given), `cumulative`, `% of budget`, `remaining`; validate `Σ ≈ budget` (or Σpct≈100) → **flag mismatch, do not auto-fix**. Download/print (CSV + print stylesheet).
Disclose: a *planned* schedule, **not** a determination of work completed or draw eligibility.
Edge: Σ≠budget → reconcile warning; empty rows → prompt.
Test: budget 1,000,000, 4×25% → 250,000 each, cumulative 100%.

---

## 5. GA4 event interface & dictionary

**Reuse** `lib/analytics.ts` `track()` and the single existing tag — no second tag, no duplicate page_view (keep `route-analytics.tsx`). **Recommended strategy (DECISION-C):** keep existing commerce event *names* (preserve history), extend their params, and **add** only genuinely new SEO-tool events. New helper: `trackTool(event, {tool_name, tool_type, content_tier, page_path})` in `lib/analytics.ts`, debounced so `seo_tool_start` fires once per tool session (not per keystroke).

| Roadmap event | Implementation |
|---|---|
| `seo_tool_start` | **NEW** — fire once on first meaningful calculator input. params: `tool_name, tool_type(calculator|template|interactive_check), content_tier, page_path` |
| `seo_tool_complete` | **NEW** — on valid result / generated template. params: +`completion_status` |
| `seo_tool_validation_error` | **NEW** — on meaningful validation fail (not per char). params: `tool_name, error_type` (generic category only) |
| `cta_click` | **EXTEND** existing — add `cta_name, cta_location, destination, content_tier, page_path` (keep `location` for continuity) |
| `site_check_checkout_start` | **MAP → existing `checkout_started`** + params `offer_type:one_time_site_check, value:9, currency:USD, source_page` |
| `monitoring_checkout_start` | **MAP → existing `subscription_checkout_started`** + `plan_name, value, currency, source_page` |
| `cdi_upgrade_checkout_start` | represent via existing `cdi_sites` param on subscription start (or add this event if you want a clean funnel step) |
| `purchase` | **DECISION-D** — not implemented today; needs verified source |
| `generate_lead` | **NEW**, only if an email-gated resource is added (roadmap says don't gate unless required) |
| `file_download` | **NEW** — on template/CSV download. params: `file_name, content_tier, source_page` |

**Dictionary / constants:** add to `GA_EVENTS`; `content_tier ∈ {tier_1,tier_2,tier_3,existing}`; `tool_type ∈ {calculator,template,interactive_check}`. **Never send:** emails, loan amounts, addresses/coords, tokens, Stripe IDs, or any user-entered financial input (matches the existing `analytics.ts` contract). Fail gracefully if gtag absent (already handled). Mark as key events in GA4 UI (manual): `seo_tool_complete`, `checkout_started`, `subscription_checkout_started`, `purchase`.

---

## 6. SEO implementation checklist

- **Sitemap** — `app/sitemap.ts` is a hard-coded array. Add every new public route; keep private/token/api out. (Verify each new slug is present at build.)
- **robots** — `app/robots.ts` is correct: `Disallow:[/demo,/admin,/setup,/s/,/api/]` + sitemap. **Do NOT** add `public/robots.txt` (collides with the route) and **do NOT** add `/check/` or `/site/` disallows — those pages use per-page `noindex`, which a disallow would hide from crawlers. No action needed unless we add new private prefixes.
- **Canonical** — every page sets `alternates:{canonical:"/<slug>"}` (relative; `metadataBase` is set in layout). Mandatory on all new pages.
- **Metadata** — unique `title` + `description` per page via the `%s · Ground Stasis` template; one `<h1>`.
- **Structured data** — reuse the `JsonLd` approach. Add a reusable `components/Faq.tsx` (renders visible FAQ **and** matching `FAQPage` JSON-LD from one source) + `components/Breadcrumbs.tsx` (visible + `BreadcrumbList`). **Only mark up visible content.** Consider moving `SoftwareApplication` to the homepage only (currently sitewide via layout) and expanding its `offers` to the real 4-rung ladder (DECISION-E, low-risk default: yes).
- **Indexability** — new pages default indexable; confirm no stray `noindex`; confirm not blocked by the `next.config` header matcher.
- **Perf/a11y** — static server components for content; client components only for calculators; labeled inputs, focus states, `aria-live` on results.

---

## 7. Regression-test plan (protect production)

**Can run here (on your machine, via the repo):** `npm run test` (vitest), `npm run typecheck`, `npm run lint`, `npm run build` (`prisma generate && next build`). Target: all green before and after each tier; no new type/lint errors; build succeeds.

**Unit-level protections (existing suites must stay green):** `pricing.test.ts` (ladder math, `seatsForPriceId`, `clampCdiSites`), `stripe.test.ts` (signature), `magic-link.test.ts`, `repository.test.ts`/`idempotency.test.ts` (entitlement + idempotent provisioning), `findings.test.ts`, `analyze-site.test.ts`. New calc tests added per §4.

**Cannot be fully driven from here (demo mode, no keys) — verify in the deployed env, never against live billing:**
- Stripe checkout open + `checkout.session.completed` provisioning + seat grant (webhook is the only provisioning path).
- CDSE live Statistical API (`scripts/validate-cdse.mjs`).
- Magic-link issue/verify round-trip; private `/site`,`/check`,`/s` access; email send.
- CDI per-site entitlement billing.

**Manual regression checklist (post-deploy):** $9 check → success link; subscription → setup link + correct seats; CDI add-on qty; billing portal; existing tool pages/URLs unchanged; token pages still noindex + gated; no secrets in client bundle.

**Hard rules:** no live Stripe product/price creation; no changing prices or Stripe IDs; no enrolling one-time buyers into subscriptions; no new DB writes from SEO pages; secrets never in frontend.

---

## 8. File-level implementation plan & dependencies

**New files (per page): ** `src/app/<slug>/page.tsx` (+ for calcs: `src/components/tools/<Name>.tsx`, pure fns in `src/lib/tools/calc.ts`, tests in `calc.test.ts`). **New shared:** `src/components/Faq.tsx`, `src/components/Breadcrumbs.tsx`, download helpers for templates (client-side `Blob`/CSV; print stylesheet). **Edited shared:** `src/lib/analytics.ts` (+events/`trackTool`), `src/components/chrome.tsx` (footer columns), `src/app/sitemap.ts` (+routes), `src/app/tools/page.tsx` (+new calculators), possibly `src/app/layout.tsx` (SoftwareApplication → home; add BreadcrumbList usage).

**Templates (draw-inspection form, draw-request):** generate on the client (print-to-PDF + CSV/markdown download) to avoid new deps and keep user data local. No email gate unless you direct otherwise.

**Dependency assessment:** none required. Everything fits existing stack (React/Next, inline CSS classes already in `globals.css`). Avoid adding chart/pdf libs; if a richer PDF is wanted later, decide then. No new runtime deps, no new env vars (except an optional GA4 MP `api_secret` if DECISION-D = server-side purchase).

---

## 9. Deployment plan

1. Work on a branch; implement tier-by-tier.
2. Per tier: `npm run lint && npm run typecheck && npm run test && npm run build` all green on your machine.
3. **Deploy method — needs confirmation (DECISION/▲):** how does `groundstasis.com` publish today? If **Git-connected**, merge → Netlify auto-builds. If **CLI**, `netlify deploy --build --prod`. (A Next.js app can't be deployed by dragging source into Netlify — it needs the build step; the plugin handles SSR/functions.)
4. Post-deploy: submit no new sitemap (same `/sitemap.xml`, now with more URLs — it updates automatically); use GSC URL Inspection → Request indexing on the new Tier-1 URLs; validate rich results (FAQ/Breadcrumb/SoftwareApplication) at `search.google.com/test/rich-results`; GA4 DebugView to confirm events.
5. Env vars unchanged. Secrets stay in Netlify env.

---

## 10. Decisions required before implementation

**A. "Construction loan monitoring" cannibalization (gates 3 pages).** Today `/construction-lender-monitoring` and `/construction-loan-risk-monitoring` both chase this intent; Tier 1 wants `/construction-loan-monitoring` and Tier 3 wants `/what-is-construction-loan-monitoring`. Four pages, one intent = cannibalization.
- **Recommended:** make `/construction-loan-monitoring` the canonical **hub**; keep the two existing guides as differentiated spokes (lender-angle, risk-angle) that link up; `/what-is-…` becomes a short definitional spoke → hub. No page removed; each gets a distinct H1/intent.
- Alt 1: repurpose `/construction-lender-monitoring` as the hub (301 the new slug to it) — fewer pages, preserves existing link equity.
- Alt 2: build all four as-specced (highest cannibalization risk) — not recommended.

**B. Scope & sequencing.** 17 pages / 6 calculators for queries totaling ~9 impressions today.
- **Recommended:** build **Tier 1 only** (escalation calc, vet/monitor pillar, draw-inspection form, delay-cost retarget, monitoring hub), ship, let it index + accrue GSC data 2–4 weeks, then pick Tier 2/3 from what actually earns impressions. Keeps you from building 12 pages blind.
- Alt: build all three tiers now (matches the prompt literally; more up-front work, more thin-page risk).

**C. GA4 event naming.** Recommended = **hybrid** (keep existing commerce names + extend params; add new SEO-tool events) to preserve historical continuity. Alt = rename everything to the roadmap's dictionary (cleaner spec, orphans existing GA history).

**D. Verified `purchase` event.** Recommended = **server-side GA4 Measurement Protocol** fired from the webhook on confirmed payment (most reliable; needs a GA4 `api_secret` env var). Alt = success-page `purchase` keyed to the Stripe session id with client-side dedup (no new secret; less reliable). **Never** fire `purchase` on checkout-start. If neither is acceptable, defer and document (per the roadmap).

**E. Low-risk defaults (proceeding unless you object):** blueprint at repo root as this file; `SoftwareApplication` → homepage only with the real 4-rung `offers`; reusable `Faq`/`Breadcrumbs` components; templates download client-side with no email gate.

**▲ Also need from you (non-blocking for most work):** LinkedIn + Crunchbase URLs and logo path (to resolve the JSON-LD `sameAs`/`logo` placeholders), and confirmation of the deploy method (§9).

---

*End of Phase 0. On approval of A–D, implementation begins with Tier 1, validated before Tier 2.*
