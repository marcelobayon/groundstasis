import * as React from "react";
import Link from "next/link";
import { BillingButton } from "./BillingButton";

// Account portfolio: every site the signed-in user monitors, with its latest
// activity status. Read-only presentational component; data is fetched in the
// /account server page. Status colors follow the product's status system.

export interface PortfolioSite {
  id: string;
  name: string;
  address: string | null;
  status: string;
  stasisScore: number;
  confidence: string;
  lastEvaluatedAt: Date | null;
}

const STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Active", color: "#00BFA5" },
  WATCH: { label: "Watch", color: "#F59E0B" },
  REVIEW: { label: "Review", color: "#FB8C00" },
  STASIS: { label: "Stasis", color: "#EF4444" },
  DATA_GAP: { label: "Data gap", color: "#64748B" },
  PAUSED: { label: "Paused", color: "#94A3B8" },
};

export function PortfolioView({ sites, token }: { sites: PortfolioSite[]; token: string }) {
  return (
    <>
      <div className="eyebrow">Your account</div>
      <h1 style={{ fontSize: 30, margin: "10px 0 6px" }}>Portfolio</h1>
      <p className="muted" style={{ marginBottom: 20, maxWidth: "60ch" }}>
        Every site you monitor, with its latest activity status. Ground Stasis is an independent monitoring signal — it
        doesn&rsquo;t replace inspections, and a data gap is never treated as inactivity.
      </p>

      {sites.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>No monitored sites yet.</p>
          <div style={{ marginTop: 12 }}>
            <Link className="btn btn-primary" href="/#pricing">
              Monitor a site
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-2">
          {sites.map((s) => {
            const st = STATUS[s.status] ?? STATUS.DATA_GAP;
            return (
              <div className="card" key={s.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <h3 style={{ margin: 0 }}>{s.name}</h3>
                  <span className="badge" style={{ background: st.color }}>
                    <span className="dot" style={{ background: "#fff" }} />
                    {st.label}
                  </span>
                </div>
                {s.address ? (
                  <p className="small muted" style={{ margin: "4px 0 0" }}>
                    {s.address}
                  </p>
                ) : null}
                <p className="small muted" style={{ marginTop: 10 }}>
                  Stasis score {s.stasisScore}/100 · {s.confidence} confidence
                  {s.lastEvaluatedAt ? ` · evaluated ${new Date(s.lastEvaluatedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <BillingButton token={token} />
    </>
  );
}
