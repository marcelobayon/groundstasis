import { SITE } from "@/lib/config/site";

export const dynamic = "force-static";

// /llms.txt — a concise, machine-readable product + API summary for LLMs and
// autonomous agents (https://llmstxt.org/ convention). Behavior-neutral: this is
// documentation, not an API surface. Pricing below reflects the live funnel.

const BODY = `# Ground Stasis

> ${SITE.tagline} Construction-activity intelligence for construction lenders: satellite imagery is the sensor.

Ground Stasis reports changes in *observable* ground-up construction activity from
satellite imagery. It is a supplementary signal, not verification. It does NOT
verify construction quality, draw eligibility, completion, fraud, dollars spent,
or loan performance, and it does not replace physical inspection. Interior work is
not observable.

## What you get
- A per-site activity classification: ACTIVE, WATCH, REVIEW, STASIS, DATA_GAP, PAUSED.
  - STASIS = little/no observable change vs. baseline (a possible slowdown, not proof work stopped).
  - DATA_GAP = insufficient usable imagery; never equivalent to STASIS.
- A 0–100 stasis score and a HIGH/MEDIUM/LOW confidence level.
- Satellite observation history with per-observation quality (cloud %, usable pixels).

## Pricing (USD)
- One-time site activity check: $9 (one site, no subscription).
- Monitoring — Foundation: $19/month (1 site).
- Monitoring — Portfolio: $49/month (up to 3 sites).
- Monitoring — Pro: $99/month (up to 10 sites).
- Construction Draw Intelligence add-on: $15/month per monitored site.

## API
- Base URL: ${SITE.url}/api/v1
- OpenAPI 3.1 spec: ${SITE.url}/api/v1/openapi.json
- Auth: API key as \`Authorization: Bearer gs_live_…\` (or \`X-API-Key\`). Keys are created in the account dashboard.
- Currently read-only (GET): sites, observations, checks, usage, webhooks. Programmatic site registration, check submission, and self-service key issuance are on the roadmap.
- Errors: \`{ "error": { "code", "message" } }\`. Respect \`Retry-After\` / \`X-RateLimit-*\` on 429.

## Docs
- Human docs: ${SITE.url}/docs
- Methodology: ${SITE.url}/methodology
`;

export function GET(): Response {
  return new Response(BODY, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
