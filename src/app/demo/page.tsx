import type { Metadata } from "next";
import * as React from "react";
import { evaluateSite } from "@/lib/analysis";
import { isUsable } from "@/lib/analysis/status";
import { changeBetween, daysBetween } from "@/lib/analysis/change";
import { DEMO_SITE } from "@/data/demo-site";
import { polygonAreaAcres } from "@/lib/geo/area";
import { assessSuitability } from "@/lib/geo/suitability";
import { StatusBadge, ConfidenceBadge, StasisScoreDial } from "@/components/status";
import { EvidenceScenes } from "@/components/evidence";
import { DemoBadge } from "@/components/brand";
import { PageView } from "@/components/pageview";
import { formatDate, formatPercent, formatCurrency, STATUS_COLOR } from "@/lib/format";

export const metadata: Metadata = {
  title: "Live demo",
  description: "A fully worked Ground Stasis demo using synthetic observations run through the real analysis engine.",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  const now = new Date(DEMO_SITE.asOf);
  const observations = DEMO_SITE.observations;
  const ev = evaluateSite(observations, undefined, now);

  const sortedAll = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const usable = sortedAll.filter((o) => isUsable(o));
  const area = polygonAreaAcres(DEMO_SITE.geometry);
  const suit = assessSuitability(DEMO_SITE.geometry);

  const latest = ev.latestObservation;
  const prev = ev.previousObservation;
  const daysSince = latest ? Math.round(daysBetween(latest.date, DEMO_SITE.asOf)) : null;

  // timeline rows
  type Row = { date: string; changePercent?: number; excluded?: boolean; note: string };
  const rows: Row[] = [];
  let prevUsable = null as (typeof usable)[number] | null;
  let maxChange = 1;
  for (const o of sortedAll) {
    if (!isUsable(o)) {
      rows.push({ date: o.date, excluded: true, note: `Excluded — cloud ${Math.round(o.cloudPercent)}%` });
      continue;
    }
    if (prevUsable) {
      const c = changeBetween(prevUsable, o).siteChangePercent;
      maxChange = Math.max(maxChange, c);
      rows.push({ date: o.date, changePercent: c, note: `${formatPercent(c)} site change · ${Math.round(o.validPixelPercent)}% usable` });
    } else {
      rows.push({ date: o.date, changePercent: 0, note: "Baseline observation" });
    }
    prevUsable = o;
  }

  const statusColor = STATUS_COLOR[ev.status];

  return (
    <section className="section" style={{ borderBottom: "none" }}>
      <PageView event="dashboard_view" params={{ demo: true }} />
      <div className="container">
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
          <DemoBadge />
          <span className="small muted">
            Synthetic observations run through the real Ground Stasis engine. No real satellite imagery.
          </span>
        </div>

        {/* ---------- header ---------- */}
        <div className="dash-head">
          <div>
            <div className="eyebrow">Project</div>
            <h1 style={{ fontSize: 30, marginTop: 6 }}>{DEMO_SITE.name}</h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {DEMO_SITE.address} · Loan {DEMO_SITE.loanNumber}
            </p>
          </div>
          <StatusBadge status={ev.status} size="lg" />
        </div>

        {/* ---------- STATUS + WHY ---------- */}
        <div className="dash-grid">
          <div className="card">
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <StasisScoreDial score={ev.stasis.score} color={statusColor} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <StatusBadge status={ev.status} />
                  <ConfidenceBadge level={ev.confidence.level} />
                </div>
                <h3 style={{ marginBottom: 6 }}>Why this status?</h3>
                <p className="muted" style={{ fontSize: 14 }}>{ev.explanation}</p>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={{ marginBottom: 6 }}>What changed?</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                Observed change over the recent window is {formatPercent(ev.stasis.recentChangePercent)}, against an
                established baseline of {formatPercent(ev.stasis.baselineChangePercent)}. {ev.stasis.consecutiveLowChange}{" "}
                consecutive usable observations show low change over ~{Math.round(ev.stasis.lowChangeDurationDays)} days.
              </p>
            </div>

            <div className="callout" style={{ marginTop: 16 }}>
              <strong>Recommended action.</strong>{" "}
              {ev.status === "STASIS" || ev.status === "REVIEW"
                ? "Review current borrower/project status, draw documentation, or inspection requirements, and decide whether a site visit is warranted."
                : "No action required. Monitoring continues automatically."}
            </div>
          </div>

          {/* ---------- key facts ---------- */}
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Key facts</h3>
            <table className="kv">
              <tbody>
                <tr><td>Last usable observation</td><td>{formatDate(latest?.date)}</td></tr>
                <tr><td>Previous usable observation</td><td>{formatDate(prev?.date)}</td></tr>
                <tr><td>Days since usable observation</td><td>{daysSince ?? "—"}</td></tr>
                <tr><td>Observed change</td><td>{formatPercent(ev.stasis.recentChangePercent)}</td></tr>
                <tr><td>Recent baseline</td><td>{formatPercent(ev.stasis.baselineChangePercent)}</td></tr>
                <tr><td>Stasis score</td><td>{ev.stasis.score}/100</td></tr>
                <tr><td>Confidence</td><td>{ev.confidence.level}</td></tr>
                <tr><td>Usable observations</td><td>{ev.usableObservationCount}</td></tr>
                <tr><td>Site area</td><td>{area.toFixed(1)} acres</td></tr>
                <tr><td>Satellite suitability</td><td>{suit.suitability}</td></tr>
                <tr><td>Loan amount (demo)</td><td>{formatCurrency(DEMO_SITE.loanAmount)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------- EVIDENCE ---------- */}
        <div id="evidence" style={{ marginTop: 34 }}>
          <div className="kicker" style={{ color: "var(--action)", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Evidence
          </div>
          <h2 style={{ fontSize: 24, margin: "6px 0 4px" }}>What the satellite saw</h2>
          <p className="muted small" style={{ marginBottom: 16 }}>
            Previous vs latest usable observation. The scenes below are schematics driven by the site indices — not
            satellite imagery — so the demo needs no imagery license.
          </p>
          {prev && latest ? (
            <div className="card">
              <EvidenceScenes prev={prev} current={latest} />
            </div>
          ) : (
            <div className="card muted">Not enough usable observations to show before/after.</div>
          )}
        </div>

        {/* ---------- timeline ---------- */}
        <div style={{ marginTop: 34 }}>
          <h2 style={{ fontSize: 24, marginBottom: 4 }}>Observation history</h2>
          <p className="muted small" style={{ marginBottom: 6 }}>
            Chronological record. Cloud-contaminated scenes are excluded from temporal conclusions — a data gap is never
            treated as inactivity.
          </p>
          <div className="card">
            <div className="timeline">
              {rows.map((r, i) => (
                <div className="tl-item" key={`${r.date}-${i}`}>
                  <div className="tl-date">{formatDate(r.date)}</div>
                  <div>
                    {r.excluded ? (
                      <div style={{ color: "var(--slate)", fontSize: 14 }}>⊘ {r.note}</div>
                    ) : (
                      <>
                        <div className="tl-bar">
                          <span
                            style={{
                              width: `${Math.max(3, Math.min(100, ((r.changePercent ?? 0) / maxChange) * 100))}%`,
                              background: (r.changePercent ?? 0) < ev.stasis.baselineChangePercent * 0.4 ? "var(--action)" : "var(--navy)",
                            }}
                          />
                        </div>
                        <div className="tl-meta">{r.note}</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- DETAILS / audit ---------- */}
        <div style={{ marginTop: 34 }}>
          <h2 style={{ fontSize: 24, marginBottom: 4 }}>Details &amp; audit</h2>
          <p className="muted small" style={{ marginBottom: 6 }}>
            Every evaluation is reproducible: it records the algorithm version, thresholds version, provider, and the
            component scores behind the number.
          </p>
          <div className="grid grid-2">
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Run metadata</h3>
              <table className="kv">
                <tbody>
                  <tr><td>Analysis version</td><td>{ev.analysisVersion}</td></tr>
                  <tr><td>Thresholds version</td><td>{ev.thresholdsVersion}</td></tr>
                  <tr><td>Provider</td><td>demo</td></tr>
                  <tr><td>Evaluated at</td><td>{formatDate(ev.evaluatedAt)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Score components</h3>
              <table className="kv">
                <tbody>
                  <tr><td>Recent low change</td><td>{ev.stasis.components.recentLowChange.toFixed(1)}</td></tr>
                  <tr><td>Historical deviation</td><td>{ev.stasis.components.historicalDeviation.toFixed(1)}</td></tr>
                  <tr><td>Duration</td><td>{ev.stasis.components.duration.toFixed(1)}</td></tr>
                  <tr><td>Consecutive low change</td><td>{ev.stasis.components.consecutive.toFixed(1)}</td></tr>
                  <tr><td>Data-quality penalty</td><td>−{ev.stasis.components.dataQualityPenalty.toFixed(1)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
