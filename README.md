# Ground Stasis

**Know when construction goes quiet.**

Ground Stasis is a hyper-narrow satellite-monitoring SaaS for construction lenders. It does one
thing: detect when a financed construction project appears to have **materially slowed or stopped**,
and alert the lender so they can investigate.

It is deliberately **not** a general construction-monitoring platform. No progress measurement, no
portfolio dashboards, no commercial imagery, no AI change detection. Just: _is this project still
moving?_

> Ground Stasis is an independent monitoring signal, not a replacement for physical inspection,
> appraisal, engineering review, or underwriting judgment. It detects changes consistent with
> construction activity and flags sites for review — it never claims a project has stopped, been
> abandoned, or involves fraud.

---

## What's in this repository

This is a **production-oriented MVP scaffold**. The parts that are the real intellectual property —
the deterministic stasis-detection engine and the conservative, trust-first product framing — are
built for real, fully typed, and unit-tested. The parts that need third-party accounts (live
satellite, Stripe, email, database) are implemented behind clean interfaces with a **demo/mock
implementation so the whole app runs locally with zero API keys**.

| Area | Status |
| --- | --- |
| Brand, landing, methodology, pricing, legal, SEO pages | ✅ Built |
| Deterministic stasis engine (indices → change → baseline → score → status) | ✅ Built + tested |
| Confidence model + false-positive protection | ✅ Built + tested |
| Alert decisions (idempotent) + email templates | ✅ Built + tested |
| Demo mode (synthetic timeline through the real engine) | ✅ Built |
| Satellite provider abstraction + **Copernicus/Sentinel Hub Statistical API adapter** | ✅ Interface + adapter (live needs CDSE keys) |
| Geometry: area, GeoJSON validation, suitability | ✅ Built + tested |
| Magic-link auth (signed, expiring, rotatable) | ✅ Built + tested |
| Stripe checkout + **webhook signature verification** | ✅ Adapter + verifier (live needs Stripe keys) |
| Email provider (console + Resend) | ✅ Built |
| Analysis job orchestration + Netlify scheduled function | ✅ Built + tested |
| Database model (Prisma schema) | ✅ Spec'd (not wired — demo needs no DB) |
| Google Analytics events | ✅ Built |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full picture and
[`DEFINITION_OF_DONE`](#definition-of-done) below.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000  (runs fully in DEMO MODE, no keys needed)
```

Key pages:

- `/` — landing page
- `/demo` — a fully worked demo site (synthetic observations run through the **real** engine)
- `/methodology` — how it works, with the line between established facts and heuristics
- `/setup` — onboarding flow (live area + suitability from an editable polygon)
- `/admin?secret=…` — internal debug view + "Run analysis" (needs `ADMIN_SECRET`)

### Scripts

```bash
npm run dev         # Next dev server
npm run build       # production build
npm run start       # serve the production build
npm run test        # run the Vitest unit suite
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
```

### Everything runs with no keys

With no `.env`, the app uses the **DemoProvider** (satellite), the **ConsoleEmailProvider** (emails
print to the server console), and no database. Nothing is faked silently: all demo output is labelled
**DEMO DATA**, and the console email provider clearly logs what _would_ be sent.

---

## Going live (short version)

1. **Database** — create a Postgres DB (Neon or Supabase, both free tiers), set `DATABASE_URL`,
   `npm install prisma @prisma/client`, then `npx prisma migrate dev`. See
   [`ENVIRONMENT.md`](./ENVIRONMENT.md).
2. **Satellite** — register a free Copernicus Data Space Ecosystem OAuth client, set
   `SATELLITE_PROVIDER=sentinelhub` + `SENTINELHUB_CLIENT_ID/SECRET`. See
   [`SATELLITE_DATA.md`](./SATELLITE_DATA.md).
3. **Email** — set `EMAIL_PROVIDER=resend` + `EMAIL_API_KEY` (or wire Postmark/SendGrid).
4. **Billing** — set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` ($19/site/mo), `STRIPE_WEBHOOK_SECRET`.
5. **Auth/admin** — set `MAGIC_LINK_SECRET` and `ADMIN_SECRET` (`openssl rand -hex 32`).

Deploy to **Netlify**: push to Git, connect the repo, set the env vars. The Next.js runtime and the
scheduled analysis function deploy automatically (see [`netlify.toml`](./netlify.toml)). Netlify hosts
the frontend + functions; the database and satellite provider are external services.

---

## Project structure

```
src/
  app/                      # Next.js App Router pages + API routes
    page.tsx                # landing
    demo/ methodology/ ...  # pages
    api/{analyze,checkout,stripe/webhook,magic-link}/route.ts
  components/               # presentational + small client components
  lib/
    analysis/               # ★ the deterministic stasis engine (pure, tested)
    satellite/              # provider abstraction + demo + CDSE adapter
    geo/                    # area, validation, suitability
    auth/                   # magic-link tokens
    email/                  # provider + alert templates
    billing/                # Stripe adapter + webhook verifier
    jobs/                   # analysis orchestration
  data/demo-site.ts         # the DEMO DATA timeline
  test/fixtures.ts          # shared test helpers
netlify/functions/          # scheduled analysis trigger
prisma/schema.prisma        # database model (spec)
```

---

## Definition of done

The MVP proves the core loop: **a lender can add a site → the system observes it → the system detects
a meaningful change/stasis signal → the lender receives a useful alert → the lender can inspect the
evidence.**

- [x] Landing page, brand, pricing, legal, methodology, SEO pages
- [x] Site onboarding flow with polygon validation, area, and suitability
- [x] Satellite provider abstraction; Sentinel-2 L2A Statistical API adapter (stubbed behind the interface until keys are added)
- [x] Cloud/quality filtering; NDVI / NDBI / BSI; temporal change; site baseline
- [x] Stasis score, confidence score, ACTIVE / WATCH / REVIEW / STASIS / DATA GAP
- [x] Stasis, activity-resumed, and data-gap alerts; idempotent; cautious copy
- [x] Evidence timeline + before/after; data-quality surfaced
- [x] Magic-link auth; Stripe checkout + webhook verification; GA events
- [x] Demo mode (explicitly labelled); unit tests; no secrets committed; mobile UX
- [ ] Live wiring of DB + CDSE + Stripe + email (requires the owner's accounts)

See the other docs: [`ARCHITECTURE`](./ARCHITECTURE.md) · [`ALGORITHM`](./ALGORITHM.md) ·
[`SATELLITE_DATA`](./SATELLITE_DATA.md) · [`METHODOLOGY`](./METHODOLOGY.md) ·
[`ENVIRONMENT`](./ENVIRONMENT.md) · [`TESTING`](./TESTING.md).
