# Environment & configuration

Copy [`.env.example`](./.env.example) to `.env.local` for development. **Never commit real secrets**
(`.gitignore` already excludes `.env*`). The app runs fully in demo mode with an empty environment.

## Variables

| Variable | Needed for | Notes |
| --- | --- | --- |
| `APP_URL` | links in emails, checkout redirects, scheduled trigger | e.g. `https://groundstasis.com` |
| `DATABASE_URL` | real sites | Postgres (Neon/Supabase). Demo needs none. |
| `SATELLITE_PROVIDER` | choosing provider | `demo` (default) or `sentinelhub` |
| `SENTINELHUB_CLIENT_ID` / `SENTINELHUB_CLIENT_SECRET` | live satellite | CDSE OAuth client (free) |
| `SENTINELHUB_BASE_URL` / `SENTINELHUB_TOKEN_URL` | live satellite | default to CDSE |
| `SENTINELHUB_AGGREGATION_INTERVAL` | live satellite | default `P12D` |
| `STRIPE_SECRET_KEY` | billing | `sk_…` |
| `STRIPE_PRICE_ID` | billing | the $19/site/month price |
| `STRIPE_WEBHOOK_SECRET` | billing | `whsec_…`, verifies webhooks |
| `EMAIL_PROVIDER` | alerts | `console` (default), `resend`, `postmark`, `sendgrid` |
| `EMAIL_API_KEY` | alerts | vendor key (Resend wired) |
| `EMAIL_FROM` | alerts | e.g. `alerts@groundstasis.com` |
| `MAGIC_LINK_SECRET` | auth | `openssl rand -hex 32` |
| `MAGIC_LINK_SECRET_PREVIOUS` | auth rotation | previous secret still verifies |
| `MAGIC_LINK_TTL_MINUTES` | auth | default 30 |
| `ADMIN_SECRET` | `/admin`, `POST /api/analyze` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | analytics | public; defaults to `G-F1R30MC86L` |

## Getting the keys

### Copernicus Data Space Ecosystem (satellite)
1. Create a free account at <https://dataspace.copernicus.eu>.
2. Dashboard → User Settings → **OAuth clients** → Create. Copy the client id + secret.
3. Set `SATELLITE_PROVIDER=sentinelhub`, `SENTINELHUB_CLIENT_ID`, `SENTINELHUB_CLIENT_SECRET`.
4. Statistical-API usage is metered in processing units under the account's quota — see the CDSE
   docs for current limits and commercial-use terms before production.

### Database (Neon or Supabase)
1. Create a Postgres project; copy the connection string into `DATABASE_URL` (`sslmode=require`).
2. `npm install prisma @prisma/client`
3. `npx prisma migrate dev --name init` (generates the client and creates tables).
4. Wire `getSitesDueForAnalysis()` and the alert/observation persistence (marked `TODO(db)` in the
   API routes and job).

### Stripe (billing)
1. Create a Product → recurring Price at **$19 / site / month**; copy the price id → `STRIPE_PRICE_ID`.
2. `STRIPE_SECRET_KEY` from Developers → API keys.
3. Add a webhook endpoint `→ {APP_URL}/api/stripe/webhook`; copy its signing secret →
   `STRIPE_WEBHOOK_SECRET`. The handler already verifies the signature.
4. Monitoring is provisioned **only** on `checkout.session.completed` — never before payment.

### Email (Resend)
1. Create a Resend API key → `EMAIL_API_KEY`, set `EMAIL_PROVIDER=resend`, verify your `EMAIL_FROM`
   domain. Postmark/SendGrid can be added behind `EmailProvider` the same way.

## Deployment (Netlify)

1. Push to GitHub and connect the repo in Netlify.
2. Build command `npm run build`, publish `.next` (see [`netlify.toml`](./netlify.toml)); the official
   Next.js runtime plugin is auto-installed.
3. Add all env vars in Site settings → Environment.
4. The scheduled function `scheduled-analysis` runs every 6h and calls `POST /api/analyze` with
   `ADMIN_SECRET`.
5. Point `groundstasis.com` DNS at Netlify. (Registering the domain and connecting the Netlify
   account are manual, owner-only steps.)
