import * as React from "react";
import Link from "next/link";
import { CtaButton } from "./cta";

export function SeoCta() {
  return (
    <div className="card" style={{ marginTop: 32, background: "var(--slate-50)" }}>
      <h3 style={{ marginBottom: 6 }}>See it on a worked example</h3>
      <p className="muted" style={{ marginBottom: 14 }}>
        Open the live demo to see a site move from Active to Stasis — status, the reasoning, and the evidence behind it.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <CtaButton href="/demo" event="cta_click" params={{ location: "seo" }}>
          Open the live demo
        </CtaButton>
        <Link className="btn btn-secondary" href="/methodology">
          Read the methodology
        </Link>
      </div>
    </div>
  );
}
