# Ground Stasis — Zapier integration

A Zapier app that turns Ground Stasis monitoring events into triggers for 9,000+ apps
(Slack, Salesforce, Teams, Gmail, Google Sheets, HubSpot…). It is **separate** from the
Next.js app — it lives here but deploys to Zapier, not Netlify.

## What it exposes

**Authentication:** an API key (create one at https://groundstasis.com/account →
Developer → API keys) with the **`webhooks:manage`** and **`sites:read`** scopes.

**Triggers (REST Hooks — instant):**
- New Observation (`observation.available`)
- Stasis Detected (`stasis.detected`)
- Activity Resumed (`activity.resumed`)
- Data Gap Detected (`data_gap.detected`)
- Site Status Changed (`site.status_changed`)

Each trigger registers Zapier's target URL via `POST /api/v1/webhooks` when the Zap turns
on, and removes it via `DELETE /api/v1/webhooks/{id}` when it turns off. The Ground Stasis
delivery worker then POSTs signed events straight into the Zap. Dedupe on the `id` field.

**Actions (Add Site, Run Check):** not in this version — they need public write endpoints
(`sites:write`) and a billing decision for metered checks. Planned as a later increment.

## Deploy it

Prerequisites: Node.js >= 22 (the Zapier CLI requires it), a Zapier account, and the Zapier CLI:
```
npm install -g zapier-platform-cli
zapier login
```

Then, from this folder:
```
npm install
# If you already created the integration in the Zapier developer portal, link to it:
zapier link
# (or, to create a brand-new one: zapier register "Ground Stasis")
zapier push
```

If `npm install` or `zapier push` complains about the platform-core version, bump it:
```
npm install zapier-platform-core@latest
zapier push
```

Validate before pushing:
```
zapier validate
```

## Test it end-to-end

1. In Zapier, make a Zap with the **Stasis Detected** trigger and connect your API key.
2. Zapier's test step calls `performList` and shows the sample payload.
3. For a real end-to-end check, use the **Send test** button on the webhook in your Ground
   Stasis dashboard (`/account`) pointed at a Zap's webhook URL, or wait for a live event.

## Notes

- Base URL is hardcoded to `https://groundstasis.com/api/v1` in `index.js`.
- The incoming event envelope is `{ id, event, created_at, data: { site_id, site_name,
  status, stasis_score, confidence, observed_at } }`.
- This folder is ignored by the Next.js build, typecheck, and lint (they scan `src/` only).
