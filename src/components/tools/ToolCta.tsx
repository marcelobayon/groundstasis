"use client";

import * as React from "react";
import Link from "next/link";

// The funnel CTA block shared by every free tool. It enforces the product
// boundary: the free tool TEACHES the problem; Ground Stasis WATCHES it.

export function ToolCta({
  heading,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  heading: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="card" style={{ marginTop: 36, background: "var(--slate-50)", borderColor: "#fed7aa" }}>
      <div className="eyebrow" style={{ color: "var(--action)" }}>Where Ground Stasis fits</div>
      <h3 style={{ margin: "8px 0 6px" }}>{heading}</h3>
      <p className="muted" style={{ marginBottom: 16 }}>{body}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn btn-primary" href={primaryHref}>{primaryLabel}</Link>
        {secondaryHref && secondaryLabel ? (
          <Link className="btn btn-secondary" href={secondaryHref}>{secondaryLabel}</Link>
        ) : null}
      </div>
    </div>
  );
}
