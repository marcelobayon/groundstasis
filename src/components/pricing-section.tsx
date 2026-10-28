"use client";

import * as React from "react";
import { useRef, useState } from "react";
import { track, getGaClientId } from "@/lib/analytics";
import {
  TIER_DISPLAY,
  DRAW_INTELLIGENCE,
  subscriptionMonthlyTotal,
  type TierId,
  type TierDisplay,
} from "@/lib/billing/pricing";

function isEmail(v: string): boolean {
  return /\S+@\S+\.\S+/.test(v.trim());
}

export function PricingSection() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<TierId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cdi, setCdi] = useState<Record<string, number>>({});
  const emailRef = useRef<HTMLInputElement>(null);

  const check = TIER_DISPLAY.find((t) => t.id === "check")!;
  const subs = TIER_DISPLAY.filter((t) => t.id !== "check");

  async function go(tier: TierId) {
    setError(null);
    if (tier === "check" && !isEmail(email)) {
      setError("Enter your email so we can send your secure results link.");
      emailRef.current?.focus();
      return;
    }
    setBusy(tier);
    const cdiSites = cdi[tier] ?? 0;
    track(tier === "check" ? "checkout_started" : "subscription_checkout_started", { tier, cdi_sites: cdiSites });
    if (cdiSites > 0) track("draw_intelligence_offer_clicked", { tier, cdi_sites: cdiSites });
    const gaClientId = await getGaClientId();
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, email: email.trim() || undefined, cdi: cdiSites, gaClientId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.message || data.error || "Checkout isn't available right now.");
    } catch {
      setError("Could not reach checkout. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="section alt" id="pricing">
      <div className="container">
        <div className="kicker">Pricing</div>
        <h2>Start where you are.</h2>
        <p className="body" style={{ maxWidth: "60ch", marginTop: 8 }}>
          Prove it on one site for $9. Watch it continuously from $19 a month. Add Construction Draw Intelligence for
          $15/site when you want milestone context. Everything is self-serve — no demos, no calls.
        </p>

        <div className="field" style={{ maxWidth: 420, marginTop: 20 }}>
          <label>Your email</label>
          <input
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@lender.com"
          />
          <p className="small muted" style={{ marginTop: 6 }}>
            Used for your receipt, your secure results link, and alerts. No spam.
          </p>
        </div>

        {/* Tripwire */}
        <div className="card" style={{ marginTop: 18, borderTop: "4px solid var(--action, #FF6B00)" }}>
          <div className="grid grid-2" style={{ alignItems: "center", gap: 20 }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--action)" }}>Start here · one-time</div>
              <div className="price" style={{ marginTop: 10 }}>
                <span className="amt">${check.amount}</span>
                <span className="per">one-time · one site</span>
              </div>
              <p className="muted" style={{ marginTop: 8 }}>{check.tagline}</p>
              <ul className="checklist" style={{ marginTop: 10 }}>
                {check.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div style={{ textAlign: "center" }}>
              <button className="btn btn-primary" onClick={() => go("check")} disabled={busy === "check"}>
                {busy === "check" ? "Opening checkout…" : `${check.cta} — $${check.amount}`}
              </button>
              <p className="small muted" style={{ marginTop: 10 }}>
                You&rsquo;ll enter the site right after payment. Takes about two minutes.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div
            className="callout"
            style={{ marginTop: 14, borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c", maxWidth: 560 }}
          >
            {error}
          </div>
        )}

        {/* Subscriptions */}
        <h3 style={{ marginTop: 30 }}>…then watch it, automatically</h3>
        <div className="grid grid-3" style={{ alignItems: "start", marginTop: 12 }}>
          {subs.map((t) => (
            <TierCard
              key={t.id}
              tier={t}
              busy={busy === t.id}
              cdiSites={cdi[t.id] ?? 0}
              onCdi={(n) => setCdi((prev) => ({ ...prev, [t.id]: n }))}
              onClick={() => go(t.id)}
            />
          ))}
        </div>

        <p className="small muted" style={{ marginTop: 18 }}>
          Construction Draw Intelligence is an optional ${DRAW_INTELLIGENCE.amount}/month add-on per upgraded site —{" "}
          <a href="/construction-draw-intelligence">see what it does</a>. Imagery availability varies with satellite
          acquisition and weather. Cancel or change plans anytime from the billing portal.
        </p>
      </div>
    </section>
  );
}

function TierCard({
  tier,
  busy,
  cdiSites,
  onCdi,
  onClick,
}: {
  tier: TierDisplay;
  busy: boolean;
  cdiSites: number;
  onCdi: (n: number) => void;
  onClick: () => void;
}) {
  const total = subscriptionMonthlyTotal(tier.id, cdiSites);
  const maxCdi = tier.seats;
  return (
    <div
      className="card"
      style={tier.highlight ? { borderTop: "4px solid var(--success, #00BFA5)", position: "relative" } : undefined}
    >
      {tier.highlight && (
        <span className="badge" style={{ background: "var(--success, #00BFA5)", fontSize: 11, position: "absolute", top: 14, right: 14 }}>
          Most popular
        </span>
      )}
      <h3 style={{ marginBottom: 4 }}>{tier.name}</h3>
      <div className="price" style={{ marginTop: 6 }}>
        <span className="amt">${tier.amount}</span>
        <span className="per">/ month{tier.seats > 1 ? ` · up to ${tier.seats} sites` : " · 1 site"}</span>
      </div>
      <p className="muted" style={{ marginTop: 6 }}>{tier.tagline}</p>
      <ul className="checklist" style={{ marginTop: 10 }}>
        {tier.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      {/* CDI add-on stepper */}
      <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--slate-50, #f8fafc)", border: "1px solid var(--slate-200, #e2e8f0)", borderRadius: 10 }}>
        <div className="small" style={{ fontWeight: 700 }}>+ Draw Intelligence</div>
        <p className="small muted" style={{ margin: "4px 0 10px" }}>
          ${DRAW_INTELLIGENCE.amount}/mo per upgraded site — milestone context on the sites you choose.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label="Fewer upgraded sites"
            onClick={() => onCdi(Math.max(0, cdiSites - 1))}
            disabled={cdiSites <= 0}
          >
            −
          </button>
          <strong style={{ minWidth: 72, textAlign: "center" }}>
            {cdiSites} / {maxCdi} site{maxCdi === 1 ? "" : "s"}
          </strong>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label="More upgraded sites"
            onClick={() => onCdi(Math.min(maxCdi, cdiSites + 1))}
            disabled={cdiSites >= maxCdi}
          >
            +
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="amt" style={{ fontSize: 26 }}>${total}</span>
        <span className="per">/ month total</span>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={onClick} disabled={busy} style={{ width: "100%" }}>
          {busy ? "Opening checkout…" : tier.cta}
        </button>
      </div>
    </div>
  );
}
