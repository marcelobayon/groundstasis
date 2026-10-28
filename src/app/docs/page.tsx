import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Documentation",
  description:
    "Ground Stasis API v1 — read your construction-site monitoring data, satellite observation history, and activity-check results over a simple REST API.",
  alternates: { canonical: "https://groundstasis.com/docs" },
};

const codeBlock: React.CSSProperties = {
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 8,
  padding: "14px 16px",
  overflowX: "auto",
  fontSize: 13,
  lineHeight: 1.5,
  margin: "10px 0 0",
};

function Endpoint({
  method,
  path,
  scope,
  children,
}: {
  method: string;
  path: string;
  scope: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          className="badge"
          style={{ background: "#00BFA5", fontFamily: "monospace", letterSpacing: 0.5 }}
        >
          {method}
        </span>
        <code style={{ fontSize: 15 }}>{path}</code>
        <span className="small muted">scope: <code>{scope}</code></span>
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="eyebrow">Developers</div>
        <h1 style={{ fontSize: 32, margin: "10px 0 8px" }}>Ground Stasis API</h1>
        <p className="muted" style={{ maxWidth: "62ch" }}>
          A small REST API over your monitoring data — sites, their satellite observation history, and one-off
          activity-check results. Read-only today; it&rsquo;s the same data that powers your dashboard. Create a key
          under <Link href="/account">your account</Link>.
        </p>

        <h2 style={{ fontSize: 22, marginTop: 32 }}>Base URL</h2>
        <pre style={codeBlock}>https://groundstasis.com/api/v1</pre>
        <p className="small muted" style={{ marginTop: 8 }}>
          Machine-readable spec: <Link href="/api/v1/openapi.json">/api/v1/openapi.json</Link> (OpenAPI 3.1).
        </p>

        <h2 style={{ fontSize: 22, marginTop: 32 }}>Authentication</h2>
        <p className="muted" style={{ maxWidth: "62ch" }}>
          Send your key as a bearer token. Keys are shown once at creation and stored only as a hash — rotate by
          revoking and minting a new one. Never ship a key in client-side code.
        </p>
        <pre style={codeBlock}>{`curl https://groundstasis.com/api/v1/sites \\
  -H "Authorization: Bearer gs_live_YOUR_KEY"`}</pre>
        <p className="small muted" style={{ marginTop: 8 }}>
          The <code>X-API-Key: gs_live_…</code> header works too.
        </p>

        <h2 style={{ fontSize: 22, marginTop: 32 }}>Scopes</h2>
        <p className="muted">A key carries only the scopes you grant it:</p>
        <ul className="small" style={{ lineHeight: 1.9 }}>
          <li><code>sites:read</code> — read sites, observations, and check results</li>
          <li><code>usage:read</code> — read your usage and rate-limit headroom</li>
          <li><code>checks:write</code>, <code>sites:write</code>, <code>webhooks:manage</code> — reserved for write and webhook endpoints as they ship</li>
        </ul>

        <h2 style={{ fontSize: 22, marginTop: 32 }}>Rate limits</h2>
        <p className="muted" style={{ maxWidth: "62ch" }}>
          The developer tier allows <strong>60 requests/minute</strong> per key. Every response carries{" "}
          <code>X-RateLimit-Limit</code> and <code>X-RateLimit-Remaining</code>; over the limit you get{" "}
          <code>429</code> with <code>{`{ "error": { "code": "rate_limited" } }`}</code>.
        </p>

        <h2 style={{ fontSize: 22, marginTop: 32 }}>Pagination</h2>
        <p className="muted" style={{ maxWidth: "62ch" }}>
          List endpoints that can grow are cursor-paginated. Pass <code>?limit=</code> (1–100) and the{" "}
          <code>next_cursor</code> from the previous response as <code>?cursor=</code>. A <code>null</code>{" "}
          <code>next_cursor</code> means the last page.
        </p>

        <h2 style={{ fontSize: 22, marginTop: 32 }}>Errors</h2>
        <p className="muted">Every error shares one shape, with a stable machine-readable <code>code</code>:</p>
        <pre style={codeBlock}>{`{ "error": { "code": "not_found", "message": "Site not found." } }`}</pre>
        <p className="small muted" style={{ marginTop: 8 }}>
          <code>401</code> unauthorized · <code>403</code> forbidden (missing scope) · <code>404</code> not_found ·{" "}
          <code>429</code> rate_limited · <code>500</code> server_error
        </p>

        <h2 style={{ fontSize: 24, marginTop: 36, marginBottom: 14 }}>Endpoints</h2>

        <Endpoint method="GET" path="/sites" scope="sites:read">
          <p className="small muted" style={{ margin: 0 }}>Every site on your account.</p>
          <pre style={codeBlock}>{`{
  "data": [
    {
      "id": "ckv…",
      "name": "Lot 7 — Maple Ridge",
      "address": "100 Main St",
      "status": "ACTIVE",
      "stasis_score": 82,
      "confidence": "HIGH",
      "last_evaluated_at": "2026-10-20T06:00:00.000Z"
    }
  ]
}`}</pre>
        </Endpoint>

        <Endpoint method="GET" path="/sites/{id}" scope="sites:read">
          <p className="small muted" style={{ margin: 0 }}>Full detail for one site, including geometry and loan metadata.</p>
          <pre style={codeBlock}>{`{
  "data": {
    "id": "ckv…",
    "name": "Lot 7 — Maple Ridge",
    "status": "ACTIVE",
    "stasis_score": 82,
    "confidence": "HIGH",
    "latitude": 40.76, "longitude": -111.89,
    "area_acres": 2.4,
    "loan_amount": 1250000, "loan_number": "LN-2291",
    "construction_start": "2026-01-15T00:00:00.000Z",
    "construction_end": null,
    "draw_intelligence": true,
    "last_evaluated_at": "2026-10-20T06:00:00.000Z",
    "created_at": "2026-01-10T…", "updated_at": "2026-10-20T…"
  }
}`}</pre>
        </Endpoint>

        <Endpoint method="GET" path="/sites/{id}/observations" scope="sites:read">
          <p className="small muted" style={{ margin: 0 }}>
            Satellite observation history, newest first, with per-observation vegetation/built-up metrics.
          </p>
          <pre style={codeBlock}>{`curl "https://groundstasis.com/api/v1/sites/ckv…/observations?limit=50" \\
  -H "Authorization: Bearer gs_live_YOUR_KEY"

{
  "data": [
    {
      "id": "obs…",
      "observation_date": "2026-10-18T00:00:00.000Z",
      "provider": "sentinel-2",
      "cloud_percent": 3.1,
      "usable_pixel_percent": 96.9,
      "quality_status": "OK",
      "metrics": { "mean_ndvi": 0.41, "site_change_percent": 12.5, "confidence": "HIGH" }
    }
  ],
  "next_cursor": "obs…"
}`}</pre>
        </Endpoint>

        <Endpoint method="GET" path="/checks/{id}" scope="sites:read">
          <p className="small muted" style={{ margin: 0 }}>
            Result of a one-off activity check. Returned only when the check&rsquo;s email matches your account email.
          </p>
          <pre style={codeBlock}>{`{
  "data": {
    "id": "chk…",
    "paid": true,
    "site_name": "Lot 7",
    "status": "STASIS",
    "stasis_score": 20,
    "confidence": "MEDIUM",
    "provider": "sentinel-2",
    "analyzed_at": "2026-10-19T12:00:00.000Z",
    "created_at": "2026-10-19T…"
  }
}`}</pre>
        </Endpoint>

        <Endpoint method="GET" path="/usage" scope="usage:read">
          <p className="small muted" style={{ margin: 0 }}>Month-to-date request total and current rate-limit headroom.</p>
          <pre style={codeBlock}>{`{
  "period": { "start": "2026-10-01T00:00:00.000Z", "interval": "month_to_date" },
  "usage": { "total_requests": 1420 },
  "rate_limit": { "per_minute": 60, "remaining": 59 }
}`}</pre>
        </Endpoint>

        <h2 style={{ fontSize: 24, marginTop: 36, marginBottom: 14 }}>Webhooks</h2>
        <p className="muted" style={{ maxWidth: "62ch" }}>
          Register an endpoint under <Link href="/account">your account</Link> and Ground Stasis POSTs a signed JSON
          event when a site changes — stasis detected, activity resumed, a data gap, a new observation, or any status
          change. Endpoints must be <code>https</code>; each has its own secret, shown once.
        </p>
        <p className="small muted" style={{ marginTop: 8 }}>
          Delivery is at-least-once with retries (exponential backoff, up to ~6 hours). Deduplicate on the{" "}
          <code>X-GroundStasis-Delivery</code> id. Payload:
        </p>
        <pre style={codeBlock}>{`{
  "id": "dlv_…",            // stable delivery id — dedupe on this
  "event": "stasis.detected",
  "created_at": "2026-10-27T…Z",
  "data": {
    "site_id": "ckv…",
    "site_name": "Lot 7 — Maple Ridge",
    "status": "STASIS",
    "stasis_score": 20,
    "confidence": "MEDIUM",
    "observed_at": "2026-10-27T…Z"
  }
}`}</pre>
        <p className="small muted" style={{ marginTop: 12 }}>
          Verify the <code>X-GroundStasis-Signature</code> header (<code>t=&lt;unix&gt;,v1=&lt;hmac&gt;</code>) against the
          raw request body before trusting it:
        </p>
        <pre style={codeBlock}>{`const crypto = require("crypto");

function verify(secret, header, rawBody) {
  const p = Object.fromEntries(header.split(",").map((s) => s.trim().split("=")));
  const expected = crypto
    .createHmac("sha256", secret)
    .update(\`\${p.t}.\${rawBody}\`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(p.v1 || "");
  const fresh = Math.abs(Date.now() / 1000 - Number(p.t)) < 300; // 5-min window
  return fresh && a.length === b.length && crypto.timingSafeEqual(a, b);
}`}</pre>

        <p className="small muted" style={{ marginTop: 24 }}>
          Write endpoints are on the roadmap. Need something specific?{" "}
          <Link href="/account">Create a key</Link> and tell us what you&rsquo;re building.
        </p>
      </div>
    </section>
  );
}
