# Architecture

Ground Stasis is intentionally small. The design goal is a **credible financial-risk monitoring
product that costs almost nothing to run** and keeps the analysis logic separate, pure, and auditable.

## The one loop that matters

```
 add site ─▶ define boundary ─▶ collect observations ─▶ quality filter
     ▲                                                        │
     │                                                        ▼
  review evidence ◀─ alert ◀─ status ◀─ stasis score ◀─ temporal change ◀─ spectral indices
```

Everything in the product serves that loop. The central question is always _"is this project still
moving?"_ and the UX hierarchy is always **STATUS → WHY → EVIDENCE → DATA QUALITY → DETAILS**.

## Layered design

| Layer | Where | Depends on | Notes |
| --- | --- | --- | --- |
| Presentation | `src/app`, `src/components` | analysis (types only) | Next.js App Router, server components by default |
| Business logic / analysis | `src/lib/analysis` | **nothing** | Pure, deterministic, dependency-free, fully tested |
| Satellite provider | `src/lib/satellite` | analysis types | Interface + Demo + CDSE Statistical API |
| Geometry | `src/lib/geo` | analysis config | Area, validation, suitability |
| Auth | `src/lib/auth` | node:crypto | Signed magic-link tokens |
| Email | `src/lib/email` | analysis types | Interface + console + Resend; alert templates |
| Billing | `src/lib/billing` | node:crypto | Stripe adapter + webhook verifier |
| Jobs | `src/lib/jobs` | all of the above | Orchestrates one analysis cycle |
| Persistence | `prisma/schema.prisma` | — | Spec only; not wired in the MVP |

The strict rule: **`src/lib/analysis` imports nothing outside itself.** That is what makes the stasis
logic portable, trivially testable, and reusable in a worker, a Lambda, or a notebook.

## Why this stack (and why Netlify is only half the story)

- **Next.js + TypeScript** — one language front-to-back; App Router server components render the
  dashboard without shipping the engine to the browser; API route handlers cover the server endpoints.
- **Netlify** hosts the frontend and light serverless/scheduled functions well. It is **not** a
  database and is **not** where heavy raster processing belongs. The real production shape is:

  ```
  Netlify (Next.js app + API routes + scheduled function)
     ├── Postgres (Neon / Supabase)          ← database, external
     └── Copernicus Data Space Statistical API ← satellite stats, external
  ```

- **No raster processing in the MVP.** The single biggest cost/complexity decision: we use the
  Sentinel Hub **Statistical API**, which computes cloud-masked, polygon-level statistics
  *server-side*. We never download rasters or run our own cloud masking for the MVP. That collapses
  "fetch bands → compute indices → mask clouds" into a few API calls and keeps everything
  serverless-friendly. The provider interface still allows a raster provider later if pixel-level
  control is ever needed. See [`SATELLITE_DATA.md`](./SATELLITE_DATA.md).

## Analysis job

`src/lib/jobs/analyze-site.ts` runs one site's cycle and is **idempotent**:

```
getAvailableObservations ─▶ evaluateSite ─▶ decideAlerts ─▶ send emails
       (provider)              (engine)       (transition)     (console/Resend)
```

- A provider failure becomes a **DATA GAP**, never a stasis (a failure must not look like inactivity).
- Alerts carry an `idempotencyKey`; passing the set of already-sent keys prevents a double-run from
  double-emailing. In production that set comes from the `SiteAlert` table.
- `netlify/functions/scheduled-analysis.ts` triggers `POST /api/analyze` on a cron (every 6h).
  Sentinel-2 yields at most a few usable scenes per week, so more frequent runs add nothing.

## Asynchrony & performance

Heavy work never happens in a page render. Pages show states (`ANALYSIS PENDING`, `ANALYSIS COMPLETE`,
`DATA GAP`, `ANALYSIS FAILED`) and the analysis runs in the scheduled job. The demo `/demo` page is
statically pre-rendered because its inputs are fixed.

## Cost control

Free/public Sentinel-2 data · server-side statistics (no raster downloads) · store derived metrics,
not raster archives · process only the site polygon · idempotent, infrequent jobs · no ML inference.
The engine has zero runtime dependencies, so cold starts are negligible.

## Security

Authorization on every site access · signed, expiring, rotatable magic links · Stripe webhook
signature verification · server-side GeoJSON validation · no secrets client-side · private site data
served `noindex` and kept out of URLs. Rate limiting belongs at the edge/middleware in production
(left out of the MVP to stay dependency-free).

## Auditability & versioning

Every evaluation records `analysisVersion` (`stasis-v0.1`), `thresholdsVersion` (`thresholds-v0.1`),
the provider, the observation ids, the metrics, the confidence, and the status. Historical scores are
never silently changed; recalculation under a new version is explicit. See [`ALGORITHM.md`](./ALGORITHM.md).
