import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free tools for construction lenders",
  description:
    "Free checklists and calculators for construction lenders — loan monitoring, draw inspections, delay cost, cost escalation, and your monitoring gap. No signup required.",
  alternates: { canonical: "/tools" },
};

const TOOLS = [
  ["Construction Loan Monitoring Checklist", "The controls a lender runs from pre-closing through every draw.", "/construction-loan-monitoring-checklist"],
  ["Construction Draw Inspection Checklist", "What a draw inspection should confirm before funds release.", "/construction-draw-inspection-checklist"],
  ["Construction Draw Inspection Form", "A free, downloadable draw inspection form to fill in or print.", "/construction-draw-inspection-form"],
  ["Utility Construction Inspection Form", "A free, downloadable utility inspection form — wet & dry utilities.", "/utility-construction-inspection-form"],
  ["Construction Delay Cost Calculator", "What a delay actually costs in interest and carry.", "/construction-delay-cost-calculator"],
  ["Construction Escalation Calculator", "Project a build cost forward at an annual escalation rate.", "/construction-escalation-calculator"],
  ["Construction Monitoring Gap Calculator", "The days between inspections with no independent confirmation.", "/construction-monitoring-gap-calculator"],
  ["Free Construction Activity Check", "Your monitoring exposure on one site — the bridge to a satellite check.", "/construction-activity-check"],
];

export default function Page() {
  return (
    <section className="section">
      <div className="container">
        <div className="eyebrow">Free tools</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Free tools for construction lenders</h1>
        <p className="lead" style={{ color: "#334155" }}>
          Practical checklists and calculators — no signup. They map the things a lender should monitor; Ground
          Stasis then watches one of them for you: whether the site is physically still moving.
        </p>
        <div className="grid grid-2" style={{ marginTop: 24 }}>
          {TOOLS.map(([title, desc, href]) => (
            <Link key={href} href={href} className="card" style={{ textDecoration: "none" }}>
              <h3 style={{ marginBottom: 6 }}>{title}</h3>
              <p className="muted" style={{ margin: 0 }}>{desc}</p>
            </Link>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 20 }}>
          Looking for the bigger picture? Start with{" "}
          <Link href="/construction-loan-monitoring">construction loan monitoring</Link>, or browse the whole <Link href="/construction-lender-stack">construction lender stack</Link>.
        </p>
      </div>
    </section>
  );
}
