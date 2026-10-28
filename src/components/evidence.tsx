import * as React from "react";
import type { Observation } from "@/lib/analysis/types";
import { changeBetween } from "@/lib/analysis/change";
import { formatDate, formatPercent } from "@/lib/format";

// Deterministic, clearly-synthetic "scene" schematics for the demo evidence
// view. These are NOT satellite imagery — they are a visual stand-in driven by
// the site-level indices so a visitor can see the surface shift from vegetated
// to built/bare over time. Every scene is labelled as a schematic.

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function pick(arr: string[], r: number): string {
  return arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function SceneSchematic({ obs, size = 260, cells = 8 }: { obs: Observation; size?: number; cells?: number }) {
  const veg = clamp((obs.ndvi.mean + 0.1) / 0.7, 0, 1);
  const built = clamp((obs.ndbi.mean + 0.2) / 0.5, 0, 1) * (1 - veg * 0.6);
  const cell = size / cells;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const r = hash01(`${obs.observationId}:${x}:${y}`);
      let fill: string;
      if (r < veg) fill = pick(["#3f8f5f", "#4b9f6a", "#5aa877", "#67b084"], hash01(`v${x}${y}${obs.observationId}`));
      else if (r < veg + built) fill = pick(["#8b97a8", "#9aa6b6", "#aab3c0"], hash01(`b${x}${y}`));
      else fill = pick(["#cbb891", "#d4c3a0", "#c2ad84"], hash01(`s${x}${y}`));
      rects.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell + 0.6} height={cell + 0.6} fill={fill} />);
    }
  }
  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Schematic site scene (demo)">
      {rects}
      <rect x="2" y="2" width={size - 4} height={size - 4} fill="none" stroke="#0a192f" strokeOpacity="0.35" strokeWidth="2" rx="6" />
      <text x="8" y={size - 8} fontSize="10" fill="#0a192f" fillOpacity="0.55" fontFamily="monospace">
        DEMO — schematic, not imagery
      </text>
    </svg>
  );
}

export function EvidenceScenes({ prev, current }: { prev: Observation; current: Observation }) {
  const ch = changeBetween(prev, current);
  return (
    <div>
      <div className="evidence">
        <div className="scene">
          <SceneSchematic obs={prev} />
          <div className="cap">
            <span>Previous</span>
            <span>{formatDate(prev.date)}</span>
          </div>
        </div>
        <div className="scene">
          <SceneSchematic obs={current} />
          <div className="cap">
            <span>Latest</span>
            <span>{formatDate(current.date)}</span>
          </div>
        </div>
      </div>
      <table className="kv" style={{ marginTop: 14 }}>
        <tbody>
          <tr>
            <td>Observed site change</td>
            <td>{formatPercent(ch.siteChangePercent)}</td>
          </tr>
          <tr>
            <td>NDVI change</td>
            <td>{ch.deltaNdvi.toFixed(3)}</td>
          </tr>
          <tr>
            <td>NDBI change</td>
            <td>{ch.deltaNdbi.toFixed(3)}</td>
          </tr>
          <tr>
            <td>BSI change</td>
            <td>{ch.deltaBsi.toFixed(3)}</td>
          </tr>
          <tr>
            <td>Days between</td>
            <td>{Math.round(ch.daysBetween)}</td>
          </tr>
        </tbody>
      </table>
      <p className="small muted" style={{ marginTop: 12 }}>
        Interpretation: observed change is {ch.siteChangePercent < 4 ? "lower than" : "within range of"} the
        site&rsquo;s recent baseline. This may indicate reduced physical activity, but satellite evidence alone
        cannot determine why.
      </p>
    </div>
  );
}
