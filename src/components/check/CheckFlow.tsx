"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import type { CheckResultDTO, CheckStatusResponse } from "@/lib/check/types";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#00BFA5",
  WATCH: "#F59E0B",
  REVIEW: "#FF6B00",
  STASIS: "#EF4444",
  DATA_GAP: "#64748B",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activity observed",
  WATCH: "Worth watching",
  REVIEW: "Review suggested",
  STASIS: "Unusually quiet",
  DATA_GAP: "Not enough usable imagery",
};

// Plain-language "what it means / what to do" per status. Deliberately cautious:
// a satellite signal never asserts work has stopped, or why. This is what turns
// the result from a mystery number into a decision — and deflects the #1 ticket.
const STATUS_GUIDE: Record<string, { meaning: string; action: string }> = {
  ACTIVE: {
    meaning:
      "Recent satellite observations show site-level change in line with — or above — this site's own baseline. The site reads as active.",
    action:
      "No action is prompted by this signal. To be told the moment that changes, watch the site continuously instead of checking it once.",
  },
  WATCH: {
    meaning:
      "Observed change has eased relative to this site's baseline, but not far enough to flag. It's worth keeping an eye on.",
    action:
      "No immediate step required. Continuous monitoring would tell you if the softening turns into a genuine quiet period.",
  },
  REVIEW: {
    meaning:
      "Recent observed change sits below this site's baseline by a margin that deserves a look — though confidence or usable data may be limited.",
    action:
      "Treat it as a prompt to sanity-check current status: recent draw activity, borrower updates, or whether a site visit is due.",
  },
  STASIS: {
    meaning:
      "Recent usable observations show materially lower site-level change than this site's established baseline — an unusually quiet stretch.",
    action:
      "Verify current status: pull recent draw documentation and borrower reporting, and decide whether a site visit is warranted. This does not confirm work has stopped, or why.",
  },
  DATA_GAP: {
    meaning:
      "There isn't enough usable imagery right now to evaluate recent activity — for example cloud cover or no recent clean acquisition. This is not a sign of inactivity.",
    action:
      "Nothing to do. With continuous monitoring, evaluation resumes automatically as soon as usable observations are available.",
  },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function CheckFlow({ token, initial }: { token: string; initial: CheckStatusResponse }) {
  const [paid, setPaid] = useState(initial.paid);
  const [result, setResult] = useState<CheckResultDTO | undefined>(initial.result);
  const [liveUnavailable, setLiveUnavailable] = useState(Boolean(initial.liveUnavailable));
  const found = initial.found;

  if (!found) {
    return (
      <Shell eyebrow="Link problem" eyebrowColor="var(--action)" title="This check link isn't valid">
        <p className="muted">
          We couldn&rsquo;t find a check for this link. If you just paid, give it a few seconds and refresh — or use the
          secure link from your email.
        </p>
        <div style={{ marginTop: 18 }}>
          <Link className="btn btn-secondary" href="/">Back home</Link>
        </div>
      </Shell>
    );
  }

  if (result) return <Results token={token} result={result} />;
  if (paid) return <SiteForm token={token} liveUnavailable={liveUnavailable} onResult={setResult} />;
  return <Finalizing token={token} onPaid={() => setPaid(true)} onLive={setLiveUnavailable} onResult={setResult} />;
}

function Shell({
  children,
  eyebrow,
  eyebrowColor,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  eyebrowColor?: string;
  title: string;
}) {
  return (
    <>
      <div className="eyebrow" style={{ color: eyebrowColor ?? "var(--action)" }}>{eyebrow}</div>
      <h1 style={{ fontSize: 30, margin: "10px 0 12px" }}>{title}</h1>
      {children}
    </>
  );
}

/** Payment confirmed via webhook — poll until it lands, then show the form. */
function Finalizing({
  token,
  onPaid,
  onLive,
  onResult,
}: {
  token: string;
  onPaid: () => void;
  onLive: (v: boolean) => void;
  onResult: (r: CheckResultDTO) => void;
}) {
  const tries = useRef(0);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/check/${encodeURIComponent(token)}`, { cache: "no-store" });
        const data: CheckStatusResponse = await res.json();
        if (!active) return;
        onLive(Boolean(data.liveUnavailable));
        if (data.analyzed && data.result) return onResult(data.result);
        if (data.paid) return onPaid();
      } catch {
        /* keep polling */
      }
    };
    void poll();
    const id = setInterval(() => {
      tries.current += 1;
      if (tries.current > 40) return clearInterval(id); // ~2 min then stop
      void poll();
    }, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [token, onPaid, onLive, onResult]);

  return (
    <Shell eyebrow="Payment received" eyebrowColor="var(--success)" title="Finalizing your check…">
      <p className="muted">
        Stripe is confirming your payment. This usually takes a few seconds — this page updates automatically. You can
        also come back anytime using the secure link we emailed you.
      </p>
      <div className="card" style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
        <Spinner />
        <span className="small muted">Waiting for payment confirmation…</span>
      </div>
    </Shell>
  );
}

/** Lowest-friction site entry: address (or coordinates) + approx size. */
function SiteForm({
  token,
  liveUnavailable,
  onResult,
}: {
  token: string;
  liveUnavailable: boolean;
  onResult: (r: CheckResultDTO) => void;
}) {
  const [siteName, setSiteName] = useState("");
  const [address, setAddress] = useState("");
  const [acres, setAcres] = useState("5");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("site_check_started", { flow: "check" });
  }, []);

  const canRun = address.trim().length > 3 && !submitting;

  async function run() {
    setSubmitting(true);
    setError(null);
    track("cta_click", { location: "check_run" });
    try {
      const res = await fetch(`/api/check/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName: siteName.trim() || undefined, address: address.trim(), acres: Number(acres) || 5 }),
      });
      const data = await res.json();
      if (res.ok && data.analyzed && data.result) {
        track("site_check_completed", { flow: "check" });
        onResult(data.result as CheckResultDTO);
        return;
      }
      setError(data.error || "The check couldn't run. Please try again.");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell eyebrow="Your check" title="Enter the site to check">
      <p className="muted" style={{ marginTop: 0 }}>
        An address is enough — we convert it to the satellite area automatically. We&rsquo;ll run one live read over the
        last ~18 months and show you what the imagery observed.
      </p>

      {liveUnavailable && (
        <div className="callout info" style={{ marginTop: 14 }}>
          Live satellite imagery isn&rsquo;t switched on in this environment yet. Your check is saved — once it&rsquo;s
          enabled, this page will run the read.
        </div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <div className="field">
          <label>Project name (optional)</label>
          <input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="e.g. Ridgeline Logistics Center" />
        </div>
        <div className="field">
          <label>Site address or coordinates</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, City, ST  —  or  41.8781, -87.6298"
          />
          <p className="small muted" style={{ marginTop: 6 }}>
            Tip: in Google Maps, right-click the site and copy the coordinates for the most precise read.
          </p>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Approx. site size (acres)</label>
          <input value={acres} onChange={(e) => setAcres(e.target.value)} inputMode="decimal" style={{ maxWidth: 160 }} />
          <p className="small muted" style={{ marginTop: 6 }}>
            Roughly how large is the construction area? We build a square around your point. Default is 5 acres.
          </p>
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" disabled={!canRun} onClick={run}>
            {submitting ? "Running the satellite read…" : "Run my check"}
          </button>
          {error && <div className="callout" style={{ marginTop: 14, borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c" }}>{error}</div>}
        </div>
      </div>

      <p className="small muted" style={{ marginTop: 16 }}>
        Ground Stasis is an independent monitoring signal and does not replace physical inspection. A single read is a
        snapshot in time.
      </p>
    </Shell>
  );
}

function Results({ token, result }: { token: string; result: CheckResultDTO }) {
  const [subMsg, setSubMsg] = useState<string | null>(null);
  const [subBusy, setSubBusy] = useState(false);
  const [cdiBusy, setCdiBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const color = STATUS_COLOR[result.status] ?? "#64748B";

  useEffect(() => {
    track("site_report_viewed", { flow: "check", status: result.status });
    track("draw_intelligence_offer_viewed", { flow: "check" });
  }, [result.status]);

  // Both buttons start a Foundation subscription; cdiSites=1 adds Draw
  // Intelligence (Foundation $19 + CDI $15 = $34/mo). A $9 buyer has no plan yet,
  // so "add CDI" starts the plan it attaches to — shown transparently below.
  async function startSub(cdiSites: number, source: "cdi" | "monitor") {
    if (source === "cdi") setCdiBusy(true);
    else setSubBusy(true);
    setSubMsg(null);
    if (cdiSites > 0) track("draw_intelligence_offer_clicked", { flow: "check" });
    track("subscription_checkout_started", { tier: "foundation", cdi_sites: cdiSites });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "foundation", cdi: cdiSites }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setSubMsg(data.message || data.error || "Subscriptions aren't available right now.");
    } catch {
      setSubMsg("Could not reach checkout. Please try again.");
    } finally {
      setCdiBusy(false);
      setSubBusy(false);
    }
  }
  const subscribe = () => startSub(0, "monitor");
  const addCdi = () => startSub(1, "cdi");

  return (
    <>
      <div className="eyebrow">Your result{result.isDemo ? " · DEMO DATA" : ""}</div>
      <h1 style={{ fontSize: 30, margin: "10px 0 4px" }}>{result.siteName || "Site check"}</h1>
      {result.address && <p className="small muted" style={{ marginTop: 0 }}>{result.address}</p>}

      <div className="card" style={{ marginTop: 16, borderTop: `4px solid ${color}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="badge" style={{ background: color, fontSize: 13 }}>{result.status}</span>
          <strong style={{ fontSize: 18 }}>{STATUS_LABEL[result.status] ?? result.status}</strong>
        </div>
        <p className="body" style={{ marginTop: 12 }}>{result.explanation}</p>

        {!result.dataGap && <ScoreGauge score={result.score} />}

        {!result.dataGap && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, borderTop: "1px solid var(--slate-200, #e2e8f0)" }}>
            <tbody>
              <Row label="Stasis score" value={`${result.score}/100`} />
              <Row label="Confidence" value={result.confidence} />
              <Row label="Observed recent change" value={`${result.recentChangePercent.toFixed(1)}%`} />
              <Row label="Site baseline change" value={`${result.baselineChangePercent.toFixed(1)}%`} />
              <Row label="Latest usable observation" value={fmtDate(result.latestObservationDate)} />
              <Row label="Previous usable observation" value={fmtDate(result.previousObservationDate)} />
              <Row label="Usable observations analysed" value={String(result.usableObservationCount)} />
              {result.areaAcres != null && <Row label="Analysed area" value={`${result.areaAcres.toFixed(1)} acres`} />}
            </tbody>
          </table>
        )}

        {result.suitability && result.suitability !== "GOOD" && (
          <p className="small" style={{ marginTop: 12, color: "#b45309" }}>
            Note: this site is on the small side for 10&nbsp;m-class imagery ({result.suitability}). Treat the signal with
            extra caution.
          </p>
        )}

        {STATUS_GUIDE[result.status] && (
          <div
            style={{
              marginTop: 18,
              padding: "14px 16px",
              background: "var(--slate-50, #f8fafc)",
              border: "1px solid var(--slate-200, #e2e8f0)",
              borderRadius: 10,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14 }}>What this means</div>
            <p className="small" style={{ margin: "4px 0 12px", color: "#334155" }}>{STATUS_GUIDE[result.status].meaning}</p>
            <div style={{ fontWeight: 700, fontSize: 14 }}>What to do</div>
            <p className="small" style={{ margin: "4px 0 0", color: "#334155" }}>{STATUS_GUIDE[result.status].action}</p>
          </div>
        )}
      </div>

      {!dismissed && (
        <div className="card" style={{ marginTop: 18, background: "var(--navy, #0A192F)", color: "#cbd5e1" }}>
          <h3 style={{ color: "#fff", marginTop: 0 }}>Your site has been checked. Keep watching what happens next.</h3>
          <p style={{ color: "#cbd5e1", marginTop: 8 }}>
            You&rsquo;ve taken the first step toward independent construction activity monitoring. Ground Stasis tracks
            observable site changes over time, so you can spot when a project may warrant closer attention.{" "}
            <strong style={{ color: "#fff" }}>Don&rsquo;t let today&rsquo;s report become yesterday&rsquo;s information.</strong>
          </p>

          <div style={{ marginTop: 14, padding: "14px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 10 }}>
            <div style={{ color: "#fff", fontWeight: 700 }}>Upgrade to Construction Draw Intelligence</div>
            <ul style={{ color: "#cbd5e1", margin: "10px 0 0", paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
              <li><strong style={{ color: "#fff" }}>Track reported milestones</strong> — stage, expected completion, upcoming draws.</li>
              <li><strong style={{ color: "#fff" }}>Spot changes that warrant review</strong> — alerts when activity appears to stall or resume.</li>
              <li><strong style={{ color: "#fff" }}>Compare expectations with observations</strong> — reported milestone vs. what imagery shows.</li>
              <li><strong style={{ color: "#fff" }}>Know what to investigate next</strong> — when photos, docs, or an inspection may be warranted.</li>
              <li><strong style={{ color: "#fff" }}>Keep an evidence timeline</strong> — observation dates and monitoring history in one place.</li>
            </ul>
          </div>

          <p className="small" style={{ color: "#cbd5e1", marginTop: 12 }}>
            <strong style={{ color: "#fff" }}>Construction Draw Intelligence: $15/month per upgraded site</strong>, added to a Ground Stasis
            monitoring plan. Adding it here starts a $19/mo Foundation plan + $15/mo Draw Intelligence ={" "}
            <strong style={{ color: "#fff" }}>$34/mo</strong>. Your $9 site check is a one-time purchase — it does not enroll you in a subscription.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button className="btn btn-primary" onClick={addCdi} disabled={cdiBusy || subBusy}>
              {cdiBusy ? "Opening checkout…" : "Add Construction Draw Intelligence to my site"}
            </button>
            <button className="btn btn-secondary" onClick={subscribe} disabled={cdiBusy || subBusy}>
              {subBusy ? "Opening checkout…" : "Just monitor it — $19/mo"}
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setDismissed(true)}
              style={{ background: "none", border: "none", color: "#94a3b8", textDecoration: "underline", cursor: "pointer", fontSize: 13, padding: 0 }}
            >
              Continue with my site report
            </button>
          </div>
          {subMsg && <p className="small" style={{ color: "#fca5a5", marginTop: 10 }}>{subMsg}</p>}

          <p className="small" style={{ color: "#64748b", marginTop: 14, lineHeight: 1.6 }}>
            Ground Stasis analyzes observable changes in satellite imagery. It cannot independently verify construction
            quality, completed-work value, code compliance, contractor performance, invoices, or whether a draw should be
            released. Cloud cover, image resolution, and revisit frequency limit observations. An alert or a lack of
            detected activity is not proof that construction has stopped, resumed, or met a milestone.
          </p>
        </div>
      )}

      <p className="small muted" style={{ marginTop: 16 }}>
        Ground Stasis is an independent monitoring signal, not a replacement for physical inspection, appraisal,
        engineering review, or underwriting judgment. Satellite evidence alone cannot determine whether construction has
        stopped, or why. Keep this link to return to your result.
      </p>
    </>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
        <span>0 · Active</span>
        <span>100 · Quiet</span>
      </div>
      <div style={{ display: "flex", height: 12, borderRadius: 999, overflow: "hidden" }}>
        <span style={{ width: "25%", background: "#00BFA5" }} />
        <span style={{ width: "25%", background: "#F59E0B" }} />
        <span style={{ width: "25%", background: "#FF6B00" }} />
        <span style={{ width: "25%", background: "#EF4444" }} />
      </div>
      <div style={{ position: "relative", height: 10 }}>
        <div
          style={{
            position: "absolute",
            left: `${pct}%`,
            transform: "translateX(-50%)",
            marginTop: 2,
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: "8px solid #0A192F",
          }}
        />
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>
        Your score: <strong>{score}/100</strong>. Lower is better — <strong>0 means no quiet signal.</strong> The score
        only climbs when recent observed change falls unusually far below this site&rsquo;s own baseline.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "7px 0", color: "#64748B", fontSize: 14 }}>{label}</td>
      <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 600, fontSize: 14 }}>{value}</td>
    </tr>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 18,
        height: 18,
        border: "2px solid #cbd5e1",
        borderTopColor: "#FF6B00",
        borderRadius: "50%",
        display: "inline-block",
        animation: "gs-spin 0.8s linear infinite",
      }}
    />
  );
}
