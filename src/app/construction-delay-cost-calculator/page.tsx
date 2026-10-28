import type { Metadata } from "next";
import Link from "next/link";
import { DelayCostCalc } from "@/components/tools/DelayCostCalc";
import { ToolCta } from "@/components/tools/ToolCta";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { ToolFootnote } from "@/components/tools/ToolFootnote";

export const metadata: Metadata = {
  title: "Calculating Construction Delay Costs (free calculator)",
  description:
    "Calculating construction delay costs: estimate the interest and carrying costs a construction delay adds to your loan, and the dollar value of catching a stall early. Free calculator, no signup.",
  alternates: { canonical: "/construction-delay-cost-calculator" },
};

const FAQ = [
  {
    q: "How do you calculate construction delay costs?",
    a: "Start with the costs that keep accruing while nothing gets built. The two biggest are interest on the outstanding loan balance (balance × annual rate ÷ 12, per month) and any fixed monthly carrying costs such as taxes and insurance. Multiply each by the number of delay months and add them together — which is exactly what this calculator does.",
  },
  {
    q: "What costs does a construction delay add?",
    a: "Primarily continued interest on drawn principal and ongoing carrying costs (taxes, insurance, and similar). There can be others — extended general conditions, re-pricing, lost opportunity — but this tool focuses on the carrying costs a lender can estimate directly from the loan.",
  },
  {
    q: "Does this include lost opportunity cost or cost escalation?",
    a: "No. It estimates interest and carrying costs only. For the separate question of how much the cost to build rises over time, use the construction escalation calculator.",
  },
  {
    q: "How do I reduce construction delay costs?",
    a: "The controllable part is time-to-detection. The expensive delay is the one you learn about late, at the next draw. Catching a slowdown earlier shortens the window over which these costs accrue — which is the job Ground Stasis does between inspections.",
  },
];

export default function Page() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Free tools", href: "/tools" },
            { name: "Construction Delay Cost Calculator", href: "/construction-delay-cost-calculator" },
          ]}
        />
        <div className="eyebrow">Free calculator</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Calculating construction delay costs</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 16 }}>
          A stalled construction project keeps accruing interest and carrying costs while nothing gets built. Put
          numbers to it — and to the value of noticing a delay early instead of at the next draw.
        </p>

        <DelayCostCalc />

        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 22 }}>How the calculation works</h2>
          <ul className="checklist" style={{ marginTop: 10 }}>
            <li>Monthly interest = outstanding balance × annual rate ÷ 12.</li>
            <li>Interest over the delay = monthly interest × delay months.</li>
            <li>Carry over the delay = monthly carrying costs × delay months.</li>
            <li>Total delay cost = interest over delay + carry over delay.</li>
          </ul>
        </div>

        <ToolCta
          heading='"Is construction still moving?" now has a dollar sign on it.'
          body="The cost above is what you pay for a delay you already know about. The real damage is the delay you don't — the weeks a quiet site goes unnoticed between inspections. Ground Stasis watches for that quiet and flags it, so the clock you just priced starts as late as possible."
          primaryHref="/construction-activity-check"
          primaryLabel="Check a site for $9"
          secondaryHref="/construction-monitoring-gap-calculator"
          secondaryLabel="Measure your monitoring gap"
        />

        <p className="small muted" style={{ marginTop: 18 }}>
          Related:{" "}
          <Link href="/construction-escalation-calculator">construction escalation calculator</Link> ·{" "}
          <Link href="/construction-loan-monitoring">construction loan monitoring</Link> ·{" "}
          <Link href="/construction-activity-check">free activity check</Link>
        </p>

        <Faq items={FAQ} />
        <ToolFootnote />
      </div>
    </section>
  );
}
