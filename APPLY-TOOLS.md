# Ground Stasis — free SEO tools patch (5 tools + hub)

Five funnel assets, each a standalone page with zero backend dependency — they
deploy and start earning SEO immediately, no DB or Stripe required. Each one
**teaches** the problem and hands off down the funnel toward the paid product;
none of them answer the core "is this site moving?" question (that's the paid
check), so they never cannibalize the product.

```
/tools (hub)
  ├─ /construction-loan-monitoring-checklist   (pillar)
  ├─ /construction-draw-inspection-checklist   (high-intent)
  ├─ /construction-delay-cost-calculator       (shareable — puts a $ on delay)
  └─ /construction-monitoring-gap-calculator   (explains the GS problem)
             └─▶ /construction-activity-check   (bridge → $19/mo today, $9 report soon)
```

## Files

**New components**
- `src/components/tools/ToolCta.tsx` — the shared funnel CTA ("where Ground Stasis fits").
- `src/components/tools/Checklist.tsx` — interactive checklist (check-off + localStorage + Print/PDF).
- `src/components/tools/DelayCostCalc.tsx`, `GapCalc.tsx`, `ActivityCheck.tsx` — the interactive tools.

**New logic (unit-tested)**
- `src/lib/tools/calc.ts` + `calc.test.ts` — the delay-cost and monitoring-gap math (6 tests, green).

**New pages**
- `src/app/tools/page.tsx` — hub.
- `src/app/construction-loan-monitoring-checklist/page.tsx`
- `src/app/construction-draw-inspection-checklist/page.tsx`
- `src/app/construction-delay-cost-calculator/page.tsx`
- `src/app/construction-monitoring-gap-calculator/page.tsx`
- `src/app/construction-activity-check/page.tsx`

No existing files are changed.

## Verify + deploy

```bash
npm run test        # includes the calculator math
npm run build       # confirms the pages compile
```
Then push — these go live independently of the DB/Stripe work.

## Two tiny manual edits

1. **Sitemap** — add the new routes to the `routes` array in `src/app/sitemap.ts`:
   ```ts
   "/tools",
   "/construction-loan-monitoring-checklist",
   "/construction-draw-inspection-checklist",
   "/construction-delay-cost-calculator",
   "/construction-monitoring-gap-calculator",
   "/construction-activity-check",
   ```
2. **Nav** — add a "Free tools" link to `src/components/chrome.tsx` (the `Nav`) pointing at `/tools`, so visitors and crawlers find them.

## Notes on the funnel wiring

- The **Free Activity Check** currently converts to the **$19/mo subscription** (the working checkout). When you build the **$9 one-time report flow** (next), swap its primary CTA to that — the "launching soon" button is the placeholder.
- **Lead magnet (fast-follow):** the checklists currently Print-to-PDF client-side. The higher-converting version gates a polished PDF behind an email capture — add that once the DB + email are live (it reuses `recordEmailEvent`). That turns these pages from pure SEO into list-building.

## What I verified, and where
- **Locally:** the calculator math (`calc.test.ts`, 6/6 green).
- **In your tree:** the React pages compile under `npm run build` (standard App Router pages; same patterns as your existing SEO pages).
