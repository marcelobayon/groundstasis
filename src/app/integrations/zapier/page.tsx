import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Zapier Integration — Construction Monitoring Alerts in Slack, Salesforce & More",
  description:
    "Connect Ground Stasis construction-loan monitoring to 9,000+ apps with Zapier. Route stasis alerts, activity-resumed events, and new satellite observations into Slack, Salesforce, Microsoft Teams, Google Sheets, Gmail, or HubSpot — no code.",
  alternates: { canonical: "https://groundstasis.com/integrations/zapier" },
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

const TRIGGERS: { name: string; desc: string }[] = [
  { name: "Stasis Detected", desc: "A site transitions into stasis — sustained lack of construction activity." },
  { name: "Activity Resumed", desc: "Construction activity resumes at a site after a stall." },
  { name: "New Observation", desc: "A fresh satellite observation is processed for a site." },
  { name: "Data Gap Detected", desc: "Usable imagery is unavailable and monitoring confidence drops." },
  { name: "Site Status Changed", desc: "Any change to a site's monitoring status." },
];

const WORKFLOWS: { app: string; example: string }[] = [
  { app: "Slack", example: "Post a #lending-risk message the moment a site enters stasis." },
  { app: "Salesforce", example: "Update the loan opportunity record when activity resumes." },
  { app: "Microsoft Teams", example: "Alert the construction-risk channel on a status change." },
  { app: "Google Sheets", example: "Append every observation to a portfolio monitoring log." },
  { app: "Gmail", example: "Email the inspector when a draw-stage site shows a data gap." },
  { app: "HubSpot", example: "Create a task for the relationship manager on stasis." },
];

export default function ZapierIntegrationPage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="eyebrow">Integrations</div>
        <h1 style={{ fontSize: 32, margin: "10px 0 8px" }}>Ground Stasis + Zapier</h1>
        <p className="muted" style={{ maxWidth: "62ch" }}>
          Route Ground Stasis construction-activity intelligence into the tools your team already uses. Zapier connects
          Ground Stasis to 9,000+ apps, so a stasis alert can land in Slack, update a Salesforce record, or append a row
          to Google Sheets — without building a single integration yourself.
        </p>
        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/account">
            Create an API key
          </Link>
          <Link className="btn btn-secondary" href="/docs">
            Read the API docs
          </Link>
        </div>

        <h2 style={{ fontSize: 22, marginTop: 36 }}>Triggers you can automate</h2>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          {TRIGGERS.map((t) => (
            <div className="card" key={t.name}>
              <strong>{t.name}</strong>
              <p className="small muted" style={{ margin: "6px 0 0" }}>{t.desc}</p>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 22, marginTop: 36 }}>Example workflows</h2>
        <p className="muted">Every trigger can fan out to any Zapier app. A few lenders already wire up:</p>
        <div style={{ marginTop: 12 }}>
          {WORKFLOWS.map((w) => (
            <div
              key={w.app}
              className="card"
              style={{ marginBottom: 10, display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}
            >
              <strong style={{ minWidth: 130 }}>Ground Stasis → {w.app}</strong>
              <span className="small muted">{w.example}</span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 22, marginTop: 36 }}>How to connect</h2>
        <ol className="muted" style={{ lineHeight: 1.8, maxWidth: "62ch" }}>
          <li>
            Create an API key in <Link href="/account">your account</Link> (Developer → API keys) with the{" "}
            <code>webhooks:manage</code> and <code>sites:read</code> scopes.
          </li>
          <li>In Zapier, start a Zap and search for <strong>Ground Stasis</strong> as the trigger app.</li>
          <li>Pick an event (e.g. <em>Stasis Detected</em>), connect your account by pasting the API key.</li>
          <li>Choose the action app — Slack, Salesforce, Sheets, anything — and map the fields.</li>
          <li>Turn the Zap on. Ground Stasis delivers signed events in real time as sites change.</li>
        </ol>
        <p className="small muted" style={{ marginTop: 10 }}>
          Each event carries a stable delivery <code>id</code> (dedupe on it), the site, its status, the stasis score,
          and confidence. Full payload + signature details are in the <Link href="/docs">API docs</Link>.
        </p>

        <h2 style={{ fontSize: 22, marginTop: 36 }}>What a delivered event looks like</h2>
        <pre style={codeBlock}>{`{
  "id": "dlv_…",
  "event": "stasis.detected",
  "created_at": "2026-10-27T12:00:00.000Z",
  "data": {
    "site_id": "ckv…",
    "site_name": "Lot 7 — Maple Ridge",
    "status": "STASIS",
    "stasis_score": 20,
    "confidence": "MEDIUM",
    "observed_at": "2026-10-27T06:00:00.000Z"
  }
}`}</pre>

        <p className="small muted" style={{ marginTop: 24 }}>
          Prefer a native integration? Salesforce and Microsoft Teams apps are on the roadmap. In the meantime, Zapier
          reaches both. <Link href="/account">Get started</Link>.
        </p>
      </div>
    </section>
  );
}
