"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { validatePolygon } from "@/lib/geo/validate";
import { polygonAreaAcres } from "@/lib/geo/area";
import { assessSuitability } from "@/lib/geo/suitability";
import { DEMO_SITE } from "@/data/demo-site";
import { track, GA_EVENTS } from "@/lib/analytics";

const SUIT_COLOR: Record<string, string> = {
  GOOD: "#00bfa5",
  LIMITED: "#f59e0b",
  INSUFFICIENT: "#ef4444",
};

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [address, setAddress] = useState("");
  const [geojson, setGeojson] = useState(JSON.stringify(DEMO_SITE.geometry, null, 2));
  const [loanAmount, setLoanAmount] = useState("");
  const [start, setStart] = useState("");
  const [completion, setCompletion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    track(GA_EVENTS.siteSetupStarted);
  }, []);

  const parsed = useMemo(() => {
    let geom: unknown = null;
    try {
      geom = JSON.parse(geojson);
    } catch {
      return { ok: false as const, errors: ["Not valid JSON yet."] };
    }
    const v = validatePolygon(geom);
    if (!v.valid) return { ok: false as const, errors: v.errors };
    const poly = geom as Parameters<typeof polygonAreaAcres>[0];
    const suit = assessSuitability(poly);
    return { ok: true as const, suit };
  }, [geojson]);

  useEffect(() => {
    if (parsed.ok) track(GA_EVENTS.polygonCreated, { acres: Math.round(parsed.suit.areaAcres) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.ok]);

  async function startMonitoring() {
    track(GA_EVENTS.checkoutStarted);
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.configured && data.url) {
        track(GA_EVENTS.monitoringStarted);
        window.location.href = data.url;
        return;
      }
      setMessage(
        "Billing isn't configured in this environment yet, so checkout is stubbed. With STRIPE_* set, this button opens Stripe Checkout, and monitoring begins only after payment is confirmed."
      );
    } catch {
      setMessage("Could not reach checkout. Try again shortly.");
    } finally {
      setSubmitting(false);
    }
  }

  const canStart = email.length > 3 && projectName.length > 0 && parsed.ok;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="eyebrow">Start monitoring</div>
        <h1 style={{ fontSize: 32, marginTop: 10 }}>Set up a site in a couple of minutes</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Onboarding is intentionally simple. In production the boundary step is an interactive map; here you can paste
          or edit GeoJSON and watch the area and satellite suitability update live.
        </p>

        <div className="card" style={{ marginTop: 22 }}>
          <div className="field">
            <label>1 · Your email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@lender.com" />
          </div>
          <div className="field">
            <label>2 · Project name</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Ridgeline Logistics Center" />
          </div>
          <div className="field">
            <label>3 · Property address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, state" />
          </div>

          <div className="field">
            <label>4 · Site boundary (GeoJSON polygon)</label>
            <div
              style={{
                border: "1px dashed var(--slate-300)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                background: "var(--slate-50)",
                fontSize: 13,
                color: "var(--slate)",
              }}
            >
              🗺️ Interactive map (Leaflet / MapLibre) goes here in production. For now, edit the polygon below — it&rsquo;s
              prefilled with a sample ~8-acre site.
            </div>
            <textarea value={geojson} onChange={(e) => setGeojson(e.target.value)} spellCheck={false} />
            <div style={{ marginTop: 8 }}>
              {parsed.ok ? (
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{parsed.suit.areaAcres.toFixed(1)} acres</strong>
                  <span
                    className="badge"
                    style={{ background: SUIT_COLOR[parsed.suit.suitability], fontSize: 11 }}
                  >
                    {parsed.suit.suitability}
                  </span>
                  <span className="small muted">≈ {parsed.suit.approxPixels.toLocaleString()} Sentinel-2 pixels</span>
                </div>
              ) : (
                <div className="small" style={{ color: "#b91c1c" }}>
                  {parsed.errors.join(" ")}
                </div>
              )}
              {parsed.ok && (
                <p className="small muted" style={{ marginTop: 6 }}>
                  {parsed.suit.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-3" style={{ marginTop: 4, gap: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>5 · Loan amount (optional)</label>
              <input value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="$" inputMode="numeric" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>6 · Expected start (optional)</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>7 · Expected completion (optional)</label>
              <input type="date" value={completion} onChange={(e) => setCompletion(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" disabled={!canStart || submitting} onClick={startMonitoring}>
              {submitting ? "Starting…" : "8 · Start monitoring"}
            </button>
            {!canStart && (
              <p className="small muted" style={{ marginTop: 10 }}>
                Add your email, a project name, and a valid site boundary to continue.
              </p>
            )}
            {message && (
              <div className="callout info" style={{ marginTop: 14 }}>
                {message}
              </div>
            )}
          </div>
        </div>

        <p className="small muted" style={{ marginTop: 16 }}>
          Monitoring begins only after payment is confirmed. Ground Stasis is an independent monitoring signal and does
          not replace physical inspection.
        </p>
      </div>
    </section>
  );
}
