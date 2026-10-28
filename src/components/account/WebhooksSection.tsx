"use client";

import { useState } from "react";

interface EndpointRow {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  description: string | null;
  createdAt: string | null;
}

// Event labels hardcoded client-side (events.ts is pure but has no display
// labels; keeping the UI copy here avoids coupling).
const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: "stasis.detected", label: "Stasis detected" },
  { value: "activity.resumed", label: "Activity resumed" },
  { value: "data_gap.detected", label: "Data gap" },
  { value: "observation.available", label: "New observation" },
  { value: "site.status_changed", label: "Status changed" },
];

export function WebhooksSection({ token, initialEndpoints }: { token: string; initialEndpoints: EndpointRow[] }) {
  const [endpoints, setEndpoints] = useState<EndpointRow[]>(initialEndpoints);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["stasis.detected", "activity.resumed"]);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(e: string) {
    setEvents((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (events.length === 0) {
      setMsg("Select at least one event.");
      return;
    }
    setBusy(true);
    setMsg(null);
    setSecret(null);
    try {
      const res = await fetch("/api/account/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, url: url.trim(), events }),
      });
      const data = await res.json();
      if (res.ok && data.secret) {
        setSecret(data.secret as string);
        setEndpoints((p) => [
          { id: data.id, url: data.url, events: data.events, active: data.active, description: null, createdAt: new Date().toISOString() },
          ...p,
        ]);
        setUrl("");
      } else {
        setMsg(data?.error?.message ?? "Couldn't create the endpoint.");
      }
    } catch {
      setMsg("Couldn't reach the server — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disable(id: string) {
    setMsg(null);
    try {
      const res = await fetch("/api/account/webhooks/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id }),
      });
      if (res.ok) setEndpoints((p) => p.map((e) => (e.id === id ? { ...e, active: false } : e)));
      else setMsg("Couldn't disable the endpoint.");
    } catch {
      setMsg("Couldn't reach the server — try again.");
    }
  }

  async function sendTest(id: string) {
    setMsg(null);
    try {
      const res = await fetch("/api/account/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id }),
      });
      setMsg(res.ok ? "Test event queued — it should arrive within a minute." : "Couldn't queue a test event.");
    } catch {
      setMsg("Couldn't reach the server — try again.");
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <div className="eyebrow">Developer</div>
      <h2 style={{ fontSize: 24, margin: "6px 0 6px" }}>Webhooks</h2>
      <p className="muted" style={{ marginBottom: 16, maxWidth: "60ch" }}>
        Get a signed POST when a site changes — stasis detected, activity resumed, a new observation. Each delivery is
        signed with your endpoint&rsquo;s secret (header <code>X-GroundStasis-Signature</code>); verify it before
        trusting the payload. The secret is shown once.
      </p>

      {secret ? (
        <div className="callout" style={{ marginBottom: 16, borderColor: "#fed7aa", background: "#fff7ed" }}>
          <strong>Copy your signing secret now — you won&rsquo;t see it again:</strong>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", margin: "8px 0 0", fontSize: 13 }}>{secret}</pre>
        </div>
      ) : null}

      {endpoints.length > 0 ? (
        <div style={{ marginBottom: 18 }}>
          {endpoints.map((ep) => (
            <div
              key={ep.id}
              className="card"
              style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: ep.active ? 1 : 0.55 }}
            >
              <div>
                <div>
                  <code style={{ fontSize: 13 }}>{ep.url}</code> {ep.active ? null : <span className="small muted">(disabled)</span>}
                </div>
                <div className="small muted" style={{ marginTop: 4 }}>{ep.events.join(", ")}</div>
              </div>
              {ep.active ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => sendTest(ep.id)}>
                    Send test
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => disable(ep.id)}>
                    Disable
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ marginBottom: 16 }}>No webhook endpoints yet.</p>
      )}

      <form onSubmit={create} className="card">
        <div className="field">
          <label htmlFor="wh-url">Endpoint URL</label>
          <input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/hooks/ground-stasis" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Events</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
            {EVENT_OPTIONS.map((ev) => (
              <label key={ev.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                <input type="checkbox" checked={events.includes(ev.value)} onChange={() => toggle(ev.value)} /> {ev.label}
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add endpoint"}
          </button>
          {msg ? (
            <span className="small muted" style={{ marginLeft: 10 }}>
              {msg}
            </span>
          ) : null}
        </div>
      </form>

      <p className="small muted" style={{ marginTop: 12 }}>
        Must be <code>https</code>. Signatures and verification are documented at <a href="/docs">/docs</a>.
      </p>
    </div>
  );
}
