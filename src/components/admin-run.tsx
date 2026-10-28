"use client";

import { useState } from "react";

export function AdminLogin() {
  const [secret, setSecret] = useState("");
  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <div className="field">
        <label>Admin secret</label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="ADMIN_SECRET"
          onKeyDown={(e) => {
            if (e.key === "Enter") window.location.href = `/admin?secret=${encodeURIComponent(secret)}`;
          }}
        />
      </div>
      <button
        className="btn btn-primary btn-sm"
        onClick={() => {
          window.location.href = `/admin?secret=${encodeURIComponent(secret)}`;
        }}
      >
        Unlock
      </button>
    </div>
  );
}

export function RunAnalysisButton({ secret }: { secret: string }) {
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    setOut(null);
    try {
      const r = await fetch("/api/analyze", { method: "POST", headers: { "x-admin-secret": secret } });
      setOut(JSON.stringify(await r.json(), null, 2));
    } catch (e) {
      setOut(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="btn btn-primary btn-sm" onClick={run} disabled={busy}>
        {busy ? "Running…" : "Run demo analysis"}
      </button>
      {out && (
        <pre
          style={{
            marginTop: 12,
            background: "#0a192f",
            color: "#e2e8f0",
            padding: 14,
            borderRadius: 8,
            fontSize: 12.5,
            overflowX: "auto",
          }}
        >
          {out}
        </pre>
      )}
    </div>
  );
}
