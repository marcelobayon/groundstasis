"use client";

import { useState } from "react";

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string | null;
}

// Scope options are hardcoded here (client-safe) rather than imported from
// lib/api/keys, which pulls in node:crypto and must not reach the browser.
const SCOPE_OPTIONS: { value: string; label: string }[] = [
  { value: "sites:read", label: "Read sites & results" },
  { value: "usage:read", label: "Read usage" },
  { value: "checks:write", label: "Request checks" },
  { value: "sites:write", label: "Register sites" },
  { value: "webhooks:manage", label: "Manage webhooks" },
];

export function ApiKeysSection({ token, initialKeys }: { token: string; initialKeys: KeyRow[] }) {
  const [keys, setKeys] = useState<KeyRow[]>(initialKeys);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["sites:read", "usage:read"]);
  const [busy, setBusy] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(s: string) {
    setScopes((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (scopes.length === 0) {
      setMsg("Select at least one scope.");
      return;
    }
    setBusy(true);
    setMsg(null);
    setPlaintext(null);
    try {
      const res = await fetch("/api/account/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), scopes }),
      });
      const data = await res.json();
      if (res.ok && data.plaintext) {
        setPlaintext(data.plaintext as string);
        setKeys((p) => [
          { id: data.id, name: data.name, prefix: data.prefix, scopes: data.scopes, lastUsedAt: null, createdAt: new Date().toISOString() },
          ...p,
        ]);
        setName("");
      } else {
        setMsg(data?.error?.message ?? "Couldn't create the key.");
      }
    } catch {
      setMsg("Couldn't reach the server — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setMsg(null);
    try {
      const res = await fetch("/api/account/keys/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id }),
      });
      if (res.ok) setKeys((p) => p.filter((k) => k.id !== id));
      else setMsg("Couldn't revoke the key.");
    } catch {
      setMsg("Couldn't reach the server — try again.");
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <div className="eyebrow">Developer</div>
      <h2 style={{ fontSize: 24, margin: "6px 0 6px" }}>API keys</h2>
      <p className="muted" style={{ marginBottom: 16, maxWidth: "60ch" }}>
        Programmatic access to your Ground Stasis data. A key is shown once at creation — store it securely and treat it
        like a password.
      </p>

      {plaintext ? (
        <div className="callout" style={{ marginBottom: 16, borderColor: "#fed7aa", background: "#fff7ed" }}>
          <strong>Copy your new key now — you won&rsquo;t see it again:</strong>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", margin: "8px 0 0", fontSize: 13 }}>{plaintext}</pre>
        </div>
      ) : null}

      {keys.length > 0 ? (
        <div style={{ marginBottom: 18 }}>
          {keys.map((k) => (
            <div
              key={k.id}
              className="card"
              style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
            >
              <div>
                <div>
                  <strong>{k.name}</strong> <code style={{ fontSize: 12 }}>{k.prefix}…</code>
                </div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  {k.scopes.join(", ")}
                  {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => revoke(k.id)}>
                Revoke
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ marginBottom: 16 }}>No API keys yet.</p>
      )}

      <form onSubmit={create} className="card">
        <div className="field">
          <label htmlFor="key-name">Key name</label>
          <input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zapier integration" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Scopes</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
            {SCOPE_OPTIONS.map((s) => (
              <label key={s.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                <input type="checkbox" checked={scopes.includes(s.value)} onChange={() => toggle(s.value)} /> {s.label}
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create API key"}
          </button>
          {msg ? (
            <span className="small muted" style={{ marginLeft: 10 }}>
              {msg}
            </span>
          ) : null}
        </div>
      </form>

      <p className="small muted" style={{ marginTop: 12 }}>
        Base URL <code>https://groundstasis.com/api/v1</code>. Authenticate with{" "}
        <code>Authorization: Bearer &lt;key&gt;</code>. Full API docs arrive as the endpoints expand.
      </p>
    </div>
  );
}
