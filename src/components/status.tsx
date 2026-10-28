import * as React from "react";
import type { SiteStatus, ConfidenceLevel } from "@/lib/analysis/types";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/format";

export function StatusBadge({ status, size = "md" }: { status: SiteStatus; size?: "md" | "lg" }) {
  const color = STATUS_COLOR[status];
  const style: React.CSSProperties =
    size === "lg" ? { fontSize: 14, padding: "9px 16px" } : {};
  return (
    <span className="badge" style={{ background: color, ...style }}>
      <span className="dot" style={{ background: "#fff" }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const color: Record<ConfidenceLevel, string> = {
    HIGH: "#00bfa5",
    MEDIUM: "#f59e0b",
    LOW: "#64748b",
  };
  const label: Record<ConfidenceLevel, string> = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
  return (
    <span className="badge badge-outline" style={{ color: "#0a192f" }}>
      <span className="dot" style={{ background: color[level] }} />
      Confidence: {label[level]}
    </span>
  );
}

/** Circular 0–100 stasis score dial. */
export function StasisScoreDial({
  score,
  color,
  size = 132,
}: {
  score: number;
  color: string;
  size?: number;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, score)) / 100;
  const offset = c * (1 - p);
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Stasis score ${score} of 100`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cx})`}
      />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.26} fontWeight="800" fill="#0a192f">
        {score}
      </text>
      <text x="50%" y="64%" textAnchor="middle" fontSize={size * 0.085} fill="#64748b">
        / 100
      </text>
    </svg>
  );
}
