"use client";

import * as React from "react";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { MILESTONE_STAGES, stageLabel, type CdiFinding } from "@/lib/cdi/findings";

const FINDING_COLOR: Record<string, string> = {
  ACTIVITY_CONSISTENT: "#00BFA5",
  ACTIVITY_RESUMED: "#00BFA5",
  REDUCED_ACTIVITY: "#F59E0B",
  POTENTIAL_DISCREPANCY: "#FF6B00",
  NOT_VERIFIABLE: "#64748B",
  INSUFFICIENT_DATA: "#64748B",
};

export interface WorkspaceSite {
  id: string;
  name: string;
  address: string | null;
  status: string | null;
  drawIntelligence: boolean;
  ownerEmail: string | null;
}
export interface MilestoneForm {
  reportedStage: string;
  expectedMilestone: string;
  targetDate: string;
  actualStageReported: string;
  drawReference: string;
  drawAmount: string;
  note: string;
}

export function SiteWorkspace({
  token,
  site,
  entitlement,
  initialMilestone,
  initialFinding,
  liveUnavailable,
}: {
  token: string;
  site: WorkspaceSite;
  entitlement: { cdiSeats: number; cdiUsed: number };
  initialMilestone: MilestoneForm;
  initialFinding: CdiFinding | null;
  liveUnavailable: boolean;
}) {
  const [m, setM] = useState<MilestoneForm>(initialMilestone);
  const [finding, setFinding] = useState<CdiFinding | null>(initialFinding);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof MilestoneForm>(k: K, v: string) {
    setM((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    track("draw_intelligence_enabled", { flow: "workspace" });
    try {
      const res = await fetch(`/api/site/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedStage: m.reportedStage,
          expectedMilestone: m.expectedMilestone || undefined,
          targetDate: m.targetDate || undefined,
          actualStageReported: m.actualStageReported || undefined,
          drawReference: m.drawReference || undefined,
          drawAmount: m.drawAmount ? Number(m.drawAmount) : undefined,
          note: m.note || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.finding) setFinding(data.finding as CdiFinding);
        setMsg(
          data.liveUnavailable
            ? "Saved. Live imagery isn't switched on in this environment yet — a finding will appear on the next monitoring cycle."
            : "Saved. Finding updated below."
        );
      } else {
        setMsg(data.error || "Could not save. Please try again.");
      }
    } catch {
      setMsg("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="eyebrow" style={{ color: "var(--action)" }}>Construction Draw Intelligence</div>
      <h1 style={{ fontSize: 30, margin: "10px 0 2px" }}>{site.name}</h1>
      {site.address && <p className="small muted" style={{ marginTop: 0 }}>{site.address}</p>}

      {liveUnavailable && (
        <div className="callout info" style={{ marginTop: 14 }}>
          Live satellite imagery isn&rsquo;t switched on in this environment yet. You can record milestones now; findings
          appear once imagery is enabled.
        </div>
      )}

      {finding && <FindingCard finding={finding} />}

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Reported milestone</h3>
        <p className="small muted" style={{ marginTop: 0 }}>
          What you or the borrower/contractor report for this site. This is your information — Ground Stasis compares it
          against what the satellite observed; it does not verify it.
        </p>

        <div className="field">
          <label>Current reported stage</label>
          <select value={m.reportedStage} onChange={(e) => set("reportedStage", e.target.value)}>
            {MILESTONE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Expected milestone (optional)</label>
            <input value={m.expectedMilestone} onChange={(e) => set("expectedMilestone", e.target.value)} placeholder="e.g. Foundation complete" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Target date (optional)</label>
            <input type="date" value={m.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Actual stage reported by borrower/contractor (optional)</label>
          <input value={m.actualStageReported} onChange={(e) => set("actualStageReported", e.target.value)} placeholder="What they told you is happening on site" />
        </div>
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Draw reference (optional)</label>
            <input value={m.drawReference} onChange={(e) => set("drawReference", e.target.value)} placeholder="e.g. Draw #4" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Draw amount (optional)</label>
            <input value={m.drawAmount} onChange={(e) => set("drawAmount", e.target.value)} inputMode="decimal" placeholder="$" />
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Note (optional)</label>
          <textarea value={m.note} onChange={(e) => set("note", e.target.value)} rows={3} />
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving & checking…" : "Save milestone & refresh finding"}
          </button>
          {msg && <p className="small muted" style={{ marginTop: 10 }}>{msg}</p>}
        </div>
      </div>

      <p className="small muted" style={{ marginTop: 16 }}>
        Draw Intelligence seats on your plan: {entitlement.cdiUsed}/{entitlement.cdiSeats} in use. Ground Stasis is an
        independent monitoring signal and does not verify construction quality, completed-work value, or whether a draw
        should be released.
      </p>
    </>
  );
}

function FindingCard({ finding }: { finding: CdiFinding }) {
  const color = FINDING_COLOR[finding.code] ?? "#0A192F";
  return (
    <div className="card" style={{ marginTop: 16, borderTop: `4px solid ${color}` }}>
      <span className="badge" style={{ background: color, fontSize: 12 }}>{finding.code.replace(/_/g, " ")}</span>
      <h3 style={{ margin: "10px 0 6px" }}>{finding.title}</h3>
      <p className="body" style={{ marginTop: 0 }}>{finding.summary}</p>

      <div className="grid grid-2" style={{ gap: 16, marginTop: 12 }}>
        <div>
          <div className="small" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b" }}>Reported</div>
          <ul className="small" style={{ margin: "6px 0 0", paddingLeft: 16, color: "#334155" }}>
            <li>Stage: {stageLabel(finding.reported.stage)}</li>
            {finding.reported.targetDate && <li>Target date: {finding.reported.targetDate}</li>}
            {finding.reported.actualStageReported && <li>Actual reported: {finding.reported.actualStageReported}</li>}
          </ul>
        </div>
        <div>
          <div className="small" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b" }}>Observed (satellite)</div>
          <ul className="small" style={{ margin: "6px 0 0", paddingLeft: 16, color: "#334155" }}>
            <li>Activity status: {finding.observed.status}</li>
            <li>Latest observation: {finding.observed.latestObservationDate ?? "—"}</li>
            <li>Usable observations: {finding.observed.usableObservationCount}</li>
            {finding.confidence && <li>Confidence: {finding.confidence}</li>}
          </ul>
        </div>
      </div>

      <p className="small" style={{ marginTop: 14, color: "#0A192F" }}>
        <strong>Recommended next action:</strong> {finding.action}
      </p>
      <p className="small muted" style={{ marginTop: 10 }}>{finding.limitations}</p>
    </div>
  );
}
