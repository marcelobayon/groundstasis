import type { Metadata } from "next";
import Link from "next/link";
import { EscalationCalc } from "@/components/tools/EscalationCalc";
import { ToolCta } from "@/components/tools/ToolCta";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { ToolFootnote } from "@/components/tools/ToolFootnote";

export const metadata: Metadata = {
  title: "Construction Escalation Calculator (free)",
  description:
    "Free construction escalation calculator: project a base construction cost forward at an annual escalation rate, with a simple or compound model. See projected cost, dollar increase, and percent increase.",
  alternates: { canonical: "/construction-escalation-calculator" },
};

const FAQ = [
  {
    q: "What is construction cost escalation?",
    a: "Construction cost escalation is the increase in the cost to build over time, driven by changes in materials, labor, and market conditions. An escalation rate expresses that increase as an annual percentage, which you can project forward over a construction or delay period.",
  },
  {
    q: "Does this use simple or compound escalation?",
    a: "Both — you choose. Compound applies the annual rate on top of each prior year's escalated amount (annual compounding), the more common convention for multi-year projections. Simple applies a flat rate times the number of years. The result states which model it used.",
  },
  {
    q: "What escalation rate should I use?",
    a: "That depends on your market, project type, and time frame, and it changes over time. This tool does not prescribe a rate — enter the figure your own cost data or cost consultant supports. The result is only as reliable as that assumption.",
  },
  {
    q: "Is this a construction quote or a guaranteed future cost?",
    a: "No. It is a generalized estimate based entirely on the assumptions you enter. It is not a contractor quote, a bid, or a guarantee of what a project will actually cost. Use it to understand scale and sensitivity, not as a project-specific price.",
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
            { name: "Construction Escalation Calculator", href: "/construction-escalation-calculator" },
          ]}
        />
        <div className="eyebrow">Free calculator</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Construction Escalation Calculator</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 16 }}>
          Project a construction cost forward at an annual escalation rate — with a simple or compound model — to see the
          projected cost, the dollar increase, and the percent increase over your time period.
        </p>

        <EscalationCalc />

        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 22 }}>Assumptions</h2>
          <ul className="checklist" style={{ marginTop: 10 }}>
            <li>The escalation rate you enter is treated as an <strong>annual</strong> rate.</li>
            <li>
              <strong>Compound</strong> applies the rate on each prior year&rsquo;s escalated amount (annual
              compounding); <strong>Simple</strong> applies a flat rate × years.
            </li>
            <li>Months are converted to years (months ÷ 12), so fractional periods are supported.</li>
            <li>Negative or non-numeric inputs are rejected with a visible message, never silently adjusted.</li>
          </ul>

          <h2 style={{ fontSize: 22, marginTop: 22 }}>Worked example</h2>
          <p className="muted">
            A <strong>$1,000,000</strong> base cost escalating at <strong>6%</strong> per year, compounded, over{" "}
            <strong>2 years</strong> projects to <strong>$1,123,600</strong> — a <strong>$123,600</strong> (12.36%)
            increase. On a simple model it would be <strong>$1,120,000</strong>.
          </p>
        </div>

        <ToolCta
          heading="Escalation is the cost of time. So is a stalled site."
          body="Every month a financed project sits idle, cost escalation keeps compounding on work that isn't getting done. Ground Stasis watches your site by satellite and flags when it goes unusually quiet — so you learn about a stall in weeks, not at the next draw."
          primaryHref="/construction-activity-check"
          primaryLabel="Check a site for $9"
          secondaryHref="/construction-delay-cost-calculator"
          secondaryLabel="Price a delay on your loan"
        />

        <p className="small muted" style={{ marginTop: 18 }}>
          Related:{" "}
          <Link href="/construction-delay-cost-calculator">delay cost calculator</Link> ·{" "}
          <Link href="/construction-monitoring-gap-calculator">monitoring gap calculator</Link> ·{" "}
          <Link href="/construction-loan-monitoring">construction loan monitoring</Link>
        </p>

        <Faq items={FAQ} />
        <ToolFootnote />
      </div>
    </section>
  );
}
