# Ground Stasis — DB backbone + CDSE validation patch

This patch adds the **database persistence layer** and wires the analysis loop to
it, plus a **CDSE Statistical API validation script**. It is additive: with no
`DATABASE_URL`, the app behaves exactly as before (demo mode).

## Files in this patch

**New**
- `src/lib/db/client.ts` — lazily-constructed Prisma singleton + `isDatabaseConfigured()`.
- `src/lib/db/mappers.ts` — domain ⇄ Prisma input mapping, typed against the generated client.
- `src/lib/db/repository.ts` — `SiteRepository` (`getSitesDueForAnalysis`, `getSiteContext`, `persistAnalysis`, `recordEmailEvent`) + `getSiteRepository()`.
- `src/lib/db/idempotency.ts` — pure idempotent alert-insert helper (skips P2002 duplicates).
- `src/lib/db/idempotency.test.ts` — unit test for the above (runs with no DB).
- `src/lib/db/repository.test.ts` — repository test against a mocked Prisma client.
- `src/lib/jobs/run.ts` — `runScheduledAnalysis()` orchestrator (DB when configured, else demo).
- `scripts/validate-cdse.mjs` — validate the live Statistical API response shape.

**Changed (full-file replacements — diff against your deployed copy before overwriting)**
- `src/lib/jobs/analyze-site.ts` — adds `observations` to `AnalyzeSiteResult` (so the caller can persist them). Only change vs the shipped file.
- `src/app/api/analyze/route.ts` — now delegates to `runScheduledAnalysis()`.

**Unchanged (already in your repo):** `prisma/schema.prisma` — no change; it is the schema these files are typed against.

## What I verified, and where

- **Locally (in this session):** the idempotent alert-skip logic (`idempotency.test.ts`, green) and the CDSE parser's field assumptions (`node scripts/validate-cdse.mjs --self-test`, green).
- **In your tree (you run this):** the Prisma-typed files (`client/mappers/repository`) and `repository.test.ts`. I could **not** run `prisma generate` or Prisma `tsc` in my sandbox because its egress policy blocks Prisma's engine host — that is a sandbox limit, not a code issue. The two steps below confirm them in seconds.

## Apply steps

1. **Copy the files** into your repo at the paths above (back up / diff the two changed files first).

2. **Add dependencies + scripts** to `package.json`:
   ```jsonc
   // dependencies
   "@prisma/client": "^5.19.1",
   // devDependencies
   "prisma": "^5.19.1",
   // scripts
   "postinstall": "prisma generate",        // ensures Netlify's build generates the client
   "db:generate": "prisma generate",
   "db:migrate": "prisma migrate deploy",    // prod
   "db:migrate:dev": "prisma migrate dev",   // local, creates migrations
   "validate:cdse": "node scripts/validate-cdse.mjs"
   ```
   Then `npm install`.

3. **Provision Postgres** (Neon or Supabase, free tier). Put the connection string in `.env.local` and in Netlify env:
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/groundstasis?sslmode=require"
   ```

4. **Generate + migrate + typecheck + test:**
   ```bash
   npm run db:generate
   npm run db:migrate:dev -- --name init   # creates prisma/migrations and applies to your DB
   npm run typecheck                        # confirms the DB layer against the generated client
   npm run test                             # includes idempotency + repository tests
   ```
   Commit the generated `prisma/migrations/` folder. On Netlify, `postinstall` runs `prisma generate`; run `npm run db:migrate` (deploy) against the production DB once.

## Validate the CDSE parser (the one real technical risk)

Before trusting the live satellite path, confirm the response shape:

```bash
SENTINELHUB_CLIENT_ID=... SENTINELHUB_CLIENT_SECRET=... npm run validate:cdse
```

It authenticates, fetches **one** real Statistical API response for a small sample AOI, and prints PASS/FAIL for each field the parser reads (`outputs.indices.bands.B0/B1/B2.stats`, the `"50.0"` percentile key, `dataMask` sample count). It prints only the response **shape** — never your secret or the token — so the output is safe to paste back to me. If any line is FAIL, send me that output and I'll adjust `sentinelhub-provider.ts`.

## Exercise the loop against a real DB (optional)

There is no site-creation flow yet (that arrives with the Stripe step — entitlement → create site). To test the persistence loop now, insert one site, e.g. with Prisma Studio (`npx prisma studio`) or a throwaway script:

```ts
// seed.ts — run with: npx tsx seed.ts  (or ts-node)
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const user = await db.user.create({ data: { email: "you@example.com" } });
await db.site.create({
  data: {
    userId: user.id,
    name: "Test Site",
    geometryGeojson: { type: "Polygon", coordinates: [[[-111.9234,40.7585],[-111.9234,40.76013],[-111.92127,40.76013],[-111.92127,40.7585],[-111.9234,40.7585]]] },
  },
});
```

Then hit the analysis endpoint (it will use the DB because `DATABASE_URL` is set):

```bash
curl -X POST https://groundstasis.com/api/analyze -H "x-admin-secret: $ADMIN_SECRET"
```

You should see the site's observations, metrics, status, and any alerts persisted, and the response summarise `{ mode: "db", sites, results }`.

## What's next (not in this patch)

- **Stripe:** on `checkout.session.completed`, create the user + subscription entitlement + the site, and email the secure setup link. This is what populates the `sites` table in production.
- **Email:** switch `EMAIL_PROVIDER=resend` + verify the sending domain; `recordEmailEvent` is already in the repository to log deliveries.
- **Site onboarding → DB:** persist the `/setup` polygon as a `Site` row (tied to the Stripe entitlement).
- **Calibration:** once real sites flow in, tune `STASIS_CONFIG` and bump `THRESHOLDS_VERSION`.
