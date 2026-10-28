"use client";

import { useMemo, useState } from "react";
import { monitoringGap, type GapBand } from "@/lib/tools/calc";

const BAND_COLOR: Record<GapBand, string> = { LOW: "#00bfa5", MODERATE: "#f59e0b", HIGH: "#ff6b00" };
const BAND_LABEL: Record<GapBand, string> = { LOW: "Low", MODERATE: "Moderate", HIGH: "High" };

export function GapCalc() {
  const [last, setLast] = useState("");
  const [cadence, setCadence] = useState("14");

  const r = useMemo(() => {
    if (!last) return null;
    return monitoringGap({ lastInspectionISO: last, cadenceDays: Number(cadence) || 14 });
  }, [last, cadence]);

  return (
    <div className="card">
      <div className="grid grid-2" style={{ gap: 14, marginTop: 0 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Date of last inspection / verified activity</label>
          <input type="date" value={last} onChange={(e) => setLast(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Your intended inspection cadence (days)</label>
          <input inputMode="numeric" value={cadence} onChange={(e) => setCadence(e.target.value)} />
        </div>
      </div>

      {r ? (
        <>
          <div className="statline" style={{ marginTop: 20 }}>
            <div className="stat">
              <div className="label">Days since</div>
              <div className="value">{r.daysSinceInspection}</div>
            </div>
            <div className="stat">
              <div className="label">Your cadence</div>
              <div className="value">{r.cadenceDays}</div>
            </div>
            <div className="stat">
              <div className="label">Monitoring gap</div>
              <div className="value">{r.gapDays} days</div>
            </div>
            <div className="stat" style={{ background: BAND_COLOR[r.band] }}>
              <div className="label" style={{ color: "rgba(255,255,255,0.85)" }}>Exposure</div>
              <div className="value" style={{ color: "#fff" }}>{BAND_LABEL[r.band]}</div>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 16, fontSize: 15 }}>
            For <strong>{r.gapDays} days</strong> beyond your intended cadence you&rsquo;ve had no independent
            confirmation this site is physically moving. That window is the monitoring gap — and it&rsquo;s exactly
            what Ground Stasis watches between inspections.
          </p>
        </>
      ) : (
        <p className="muted" style={{ marginTop: 18 }}>Enter a last-inspection date to see your monitoring gap.</p>
      )}
    </div>
  );
}
