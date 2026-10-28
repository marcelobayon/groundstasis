# Ground Stasis — SEO Roadmap Tier 1: Change Report

Date: 2026-10-21 · Phase: Tier 1 implemented, **awaiting your Windows build + deploy**. No production billing, pricing, Stripe, CDSE, auth, or entitlement code was touched.

Decisions applied (your approval): A) new hub + keep cousins as spokes · B) Tier 1 only, architecture preserved for Tiers 2–3 · C) hybrid GA4 (keep existing, add new) · D) purchase event — **proposed below, not implemented** (needs a small plumbing change through the payment path + your go-ahead).

---

## 1. Summary of completed work

Built the 5 Tier-1 items plus the shared architecture that Tiers 2–3 will reuse:

- **New calculator** `/construction-escalation-calculator` (simple/compound, validated, instrumented, FAQ + breadcrumbs + CTA).
- **New pillar** `/vet-monitor-builders-construction-lending-risk` (your highest-intent query).
- **New template** `/construction-draw-inspection-form` (fill-in + download `.txt` + print; no email gate; reported-vs-observed kept distinct).
- **Retargeted in place** `/construction-delay-cost-calculator` → H1/title/intro now match "calculating construction delay costs"; added FAQ, internal links, tool analytics. URL + calculator unchanged.
- **New hub** `/construction-loan-monitoring` (canonical intent), with the two existing cousins kept live, given distinct intent, and linked up to the hub.
- **Shared, reusable:** `Faq` (visible + FAQPage JSON-LD from one source), `Breadcrumbs` (visible + BreadcrumbList), a client download helper, and new GA4 SEO-tool events + helpers.
- **Internal linking:** sitewide footer rebuilt into Free tools / Product / Company columns — this de-orphans the homepage and every tool page and concentrates link equity.
- **Schema:** moved `SoftwareApplication` to the homepage only, expanded to the real 4-rung offers ($9 / $19 / $49 / $99); `Organization` + `WebSite` remain sitewide.

---

## 2. Routes added / modified

**New public URLs (4):**
- `/construction-escalation-calculator`
- `/construction-loan-monitoring`
- `/vet-monitor-builders-construction-lending-risk`
- `/construction-draw-inspection-form`

**Modified pages (5):** `/construction-delay-cost-calculator` (retarget), `/construction-lender-monitoring` (hub up-link + intent), `/construction-loan-risk-monitoring` (hub up-link + intent), `/` (SoftwareApplication schema), `/tools` (added 2 tools + hub link).

No existing URL changed or redirected. No private/token route touched.

---

## 3. Files changed

**New (9 code + 2 docs):**
`src/components/Faq.tsx`, `src/components/Breadcrumbs.tsx`, `src/components/tools/download.ts`, `src/components/tools/EscalationCalc.tsx`, `src/components/tools/DrawInspectionForm.tsx`, `src/app/construction-escalation-calculator/page.tsx`, `src/app/construction-loan-monitoring/page.tsx`, `src/app/vet-monitor-builders-construction-lending-risk/page.tsx`, `src/app/construction-draw-inspection-form/page.tsx`; plus `SEO-ROADMAP-IMPLEMENTATION.md` and this report.

**Modified (11):**
`src/lib/analytics.ts` (+SEO events/helpers), `src/lib/tools/calc.ts` (+escalationCost), `src/lib/tools/calc.test.ts` (+escalation tests), `src/components/tools/DelayCostCalc.tsx` (instrumented), `src/app/construction-delay-cost-calculator/page.tsx` (retarget), `src/app/layout.tsx` (SoftwareApplication → home), `src/app/page.tsx` (+SoftwareApplication w/ offers), `src/app/sitemap.ts` (+4 routes), `src/app/tools/page.tsx` (+2 tools), `src/components/chrome.tsx` (footer columns), `src/app/construction-lender-monitoring/page.tsx` + `src/app/construction-loan-risk-monitoring/page.tsx` (hub up-links + intent).

---

## 4. Calculator formulas + test results

**Escalation** (`escalationCost`): `years = unit==="months" ? value/12 : value`; compound `base·(1+r)^years`, simple `base·(1+r·years)`, `r = rate/100`. Outputs projected cost, dollar increase, pct increase (0 when base=0). Negatives/invalid → visible validation error (not silent clamp); non-finite guarded.

**Unit tests:** ran the full `calc.test.ts` in an isolated Linux vitest harness → **11/11 passed**, including escalation cases: $1,000,000 @6%/2y compound = **$1,123,600** (+$123,600, 12.36%); simple = **$1,120,000**; 18 months handled as 1.5y; zero-rate/zero-time return base; negatives clamp to a safe 0. Existing `delayCost` and `monitoringGap` tests unchanged and green.

---

## 5. GA4 events implemented (hybrid)

Reuses the existing tag + `track()`; no second tag, no duplicate page_view. New, additive:

| Event | Where | Params |
|---|---|---|
| `seo_tool_start` | first input on escalation + delay-cost calcs, draw form | tool_name, tool_type, content_tier, page_path |
| `seo_tool_complete` | first valid result / on form download or print | + completion_status |
| `seo_tool_validation_error` | invalid input on escalation calc | tool_name, error_type (generic) |
| `file_download` | draw inspection form `.txt` download | file_name, content_tier, source_page |

Existing commerce events (`cta_click`, `checkout_started`, `subscription_checkout_started`, …) left unchanged to preserve history. **No** user-entered financial values, emails, addresses, tokens, or Stripe ids are sent. **Not implemented:** `generate_lead` (no email gate added, per the roadmap), `purchase` (see §8), `cdi_upgrade_checkout_start` (existing `subscription_checkout_started` + `cdi_sites` param already covers this).

**Verify:** GA4 → DebugView. Interact with a calculator → `seo_tool_start` then `seo_tool_complete`; type a negative base cost → `seo_tool_validation_error`; download the draw form → `file_download` + `seo_tool_complete`. Mark `seo_tool_complete` as a key event in the GA4 UI if you want it in conversions (not changed automatically).

---

## 6. SEO validation

- **Sitemap:** `src/app/sitemap.ts` now lists all 4 new URLs + existing public pages; private/api/token routes excluded. (Serve-time XML validates once deployed.)
- **robots.ts:** unchanged and correct (`Disallow: /demo, /admin, /setup, /s/, /api/`). No static `public/robots.txt` added. `/check` + `/site` stay out of the index via their existing per-page `noindex`.
- **Canonicals:** every new page sets a relative canonical; metadata titles/descriptions are unique.
- **Structured data:** FAQPage on the 4 new/retargeted pages (from the same visible content), BreadcrumbList on new pages, SoftwareApplication on the homepage (4 offers), Organization + WebSite sitewide. Validate each new URL at `search.google.com/test/rich-results` after deploy.

---

## 7. Regression

- **typecheck:** clean across the whole project (before and after). **lint:** "No ESLint warnings or errors."
- **Untouched protected infra:** no change to `lib/billing/*`, `/api/checkout`, `/api/stripe/webhook`, `lib/satellite/*`, `lib/cdi/*`, `lib/auth/*`, `lib/db/*`, pricing, or env. Existing pages unchanged except the two cousins (additive link) and the homepage (additive schema).

---

## 8. Known limitations & blockers

1. **Production build not run in this session.** `next build` needs `prisma generate`, and Prisma's engine host (`binaries.prisma.sh`) returns 403 on the device's Linux network (same limit noted in `APPLY.md`). Your Windows `node_modules` already has the engine, so **run the build on Windows** (commands in §9). Unit tests were validated in an isolated harness; `npm run test` should also be run on Windows for the full suite.
2. **Decision D — verified `purchase` event (proposal, needs your go-ahead).** The checkout flow carries no GA4 `client_id` today, so a server-side Measurement Protocol `purchase` can't attribute to the visitor's original session yet. Smallest safe, fully additive change (no pricing / flow / provisioning changes):
   - **Client** (`pricing-section.tsx`, `ActivityCheck.tsx`): read the GA `client_id` (`gtag('get', '<id>', 'client_id', cb)` or the `_ga` cookie) and include it as `gaClientId` in the POST to `/api/checkout`.
   - **`/api/checkout`:** put it in Stripe session metadata (`gs_ga_client_id`) — metadata only.
   - **Webhook** (`checkout.session.completed`, after successful provisioning): send a GA4 MP `purchase` with `client_id` from metadata, `transaction_id` = Stripe session id, value/currency/items from the verified session; dedup on the existing webhook idempotency so retries don't double-count; wrapped in try/catch so it can never block provisioning.
   - **Env:** add a server-only `GA4_API_SECRET` in Netlify (never exposed client-side).
   - If `client_id` is missing (cookie blocked), skip the event rather than fabricate attribution. **Never** fire `purchase` on checkout-start.
   Say the word and I'll implement exactly this as an isolated change.

---

## 9. Deployment procedure (run on your Windows machine)

```powershell
cd "C:\Users\BIG DOG PAWN\Desktop\Master GroundStasis\groundstasis"
npm run lint
npm run typecheck
npm run test          # full vitest suite (incl. new escalation tests)
npm run build         # prisma generate && next build — must pass before deploy
```

Then deploy via your existing Netlify path. **Please confirm which it is** so I can tailor future steps:
- **Git-connected:** commit + push → Netlify auto-builds.
- **CLI:** `netlify deploy --build --prod`.

(No env-var changes for Tier 1.) After deploy: GSC → URL Inspection → Request indexing for the 4 new URLs; run each through the Rich Results test; confirm events in GA4 DebugView.

**Do not** drag the source folder into Netlify — this is a Next.js app and needs the build step.

---

## 10. After Tier 1 is live

Let it index. In ~2–4 weeks, use GSC impressions/clicks/queries to choose what Tier 2/3 to build (escalation calculator and the pillar are the ones to watch first). **Reminder you asked for:** once Tier 1 is deployed and verified, start the directory listing kit (`ground-stasis-directory-listing-kit.md`) while the pages index — LinkedIn + Crunchbase first (they also resolve the JSON-LD `sameAs`/logo placeholders).
