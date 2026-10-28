"use client";

import { useMemo, useState } from "react";
import { monitoringGap, type GapBand } from "@/lib/tools/calc";
import { getGaClientId } from "@/lib/analytics";

const BAND_COLOR: Record<GapBand, string> = { LOW: "#00bfa5", MODERATE: "#f59e0b", HIGH: "#ff6b00" };
const BAND_LINE: Record<GapBand, string> = {
  LOW: "You're within your own cadence — low exposure for now.",
  MODERATE: "You're past your intended cadence. This is when projects quietly slip.",
  HIGH: "You've been flying blind on this site for a while. This is exactly the situation Ground Stasis is built for.",
};

export function ActivityCheck() {
  const [project, setProject] = useState("");
  const [last, setLast] = useState("");
  const [cadence, setCadence] = useState("14");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"check" | "foundation" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const r = useMemo(() => {
    if (!last) return null;
    return monitoringGap({ lastInspectionISO: last, cadenceDays: Number(cadence) || 14 });
  }, [last, cadence]);

  async function startCheckout(tier: "check" | "foundation") {
    if (tier === "check" && !/\S+@\S+\.\S+/.test(email.trim())) {
      setMsg("Enter your email so we can send your secure results link.");
      return;
    }
    setBusy(tier);
    setMsg(null);
    const gaClientId = await getGaClientId();
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, email: email.trim() || undefined, gaClientId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMsg(data.message ?? data.error ?? "Checkout isn't switched on yet. (Finish the Stripe setup to enable it.)");
    } catch {
      setMsg("Couldn't reach checkout — try again in a moment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card">
      <div className="field">
        <label>Project name or address</label>
        <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. 123 Main St / Ridgeline Logistics" />
      </div>
      <div className="grid grid-2" style={{ gap: 14, marginTop: 0 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Date of last verified activity / inspection</label>
          <input type="date" value={last} onChange={(e) => setLast(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Your intended inspection cadence (days)</label>
          <input inputMode="numeric" value={cadence} onChange={(e) => setCadence(e.target.value)} />
        </div>
      </div>

      {r ? (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="badge" style={{ background: BAND_COLOR[r.band] }}>
              <span className="dot" style={{ background: "#fff" }} />
              {r.gapDays} day gap
            </span>
            <strong>{project ? project : "This site"}</strong>
          </div>
          <p className="muted" style={{ marginTop: 12, fontSize: 15 }}>{BAND_LINE[r.band]}</p>

          <div className="callout" style={{ marginTop: 14 }}>
            <strong>What this free check tells you:</strong> how long you&rsquo;ve had no independent confirmation
            this site is moving. <strong>What it doesn&rsquo;t:</strong> whether the site has actually stalled —
            that needs eyes on it. A Ground Stasis satellite check shows what the site has <em>physically looked
            like</em> over that window, and a subscription watches it from here on.
          </div>

          <div className="field" style={{ marginTop: 16, maxWidth: 360 }}>
            <label>Your email (for your secure results link)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@lender.com" />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            <button className="btn btn-primary" onClick={() => startCheckout("check")} disabled={busy !== null}>
              {busy === "check" ? "Opening checkout…" : "Run a $9 satellite check on this site"}
            </button>
            <button className="btn btn-secondary" onClick={() => startCheckout("foundation")} disabled={busy !== null}>
              {busy === "foundation" ? "Opening checkout…" : "Monitor this site automatically — $19/mo"}
            </button>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            The $9 check is a one-time read of what the satellite observed on this site. The subscription watches it
            from here on.
          </p>
          {msg ? <p className="small muted" style={{ marginTop: 8 }}>{msg}</p> : null}
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 18 }}>
          Enter the date you last confirmed activity to see your exposure on this site.
        </p>
      )}
    </div>
  );
}
