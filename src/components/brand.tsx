import * as React from "react";

/**
 * Ground Stasis mark: a ground plane (receding grid) with a single vertical
 * observation marker and a node above it. It reads as "ground + monitoring +
 * a fixed point of observation" — deliberately NOT a satellite.
 */
export function Logo({ height = 26, mono = false }: { height?: number; mono?: boolean }) {
  const ink = mono ? "#ffffff" : "#0a192f";
  const faint = mono ? "rgba(255,255,255,0.45)" : "#94a3b8";
  const accent = "#ff6b00";
  const icon = Math.round(height * 1.08);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width={icon} height={icon} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {/* ground plane */}
        <line x1="3" y1="25" x2="29" y2="25" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        <line x1="7" y1="21" x2="25" y2="21" stroke={faint} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="17.5" x2="22" y2="17.5" stroke={faint} strokeWidth="1.5" strokeLinecap="round" />
        {/* observation marker */}
        <line x1="16" y1="25" x2="16" y2="10" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="8" r="3.4" fill={accent} />
      </svg>
      <span
        style={{
          fontWeight: 800,
          letterSpacing: "-0.02em",
          fontSize: Math.round(height * 0.72),
          color: ink,
          whiteSpace: "nowrap",
        }}
      >
        Ground Stasis
      </span>
    </span>
  );
}

export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span className="demo-flag" title="Synthetic demonstration data — not real satellite analysis">
      ● {label}
    </span>
  );
}
