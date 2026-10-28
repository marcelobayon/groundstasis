import type { Metadata } from "next";
import { GapCalc } from "@/components/tools/GapCalc";
import { ToolCta } from "@/components/tools/ToolCta";
import { ToolFootnote } from "@/components/tools/ToolFootnote";

export const metadata: Metadata = {
  title: "Construction Monitoring Gap Calculator (free)",
  description:
    "Free calculator: measure the gap between your construction inspections — the days you have no independent confirmation a site is still moving.",
  alternates: { canonical: "/construction-monitoring-gap-calculator" },
};

export default function Page() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="eyebrow">Free calculator</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Construction Monitoring Gap Calculator</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 16 }}>
          Inspections are periodic; risk isn&rsquo;t. This measures your monitoring gap — the stretch between
          site checks where no one is independently confirming the project is physically moving.
        </p>

        <GapCalc />

        <ToolCta
          heading="The gap is the risk. Ground Stasis watches the gap."
          body="Between inspections you're relying on borrower reporting alone. Ground Stasis fills that stretch with satellite observations — comparing the site over time and flagging when physical change goes unusually quiet, so the gap stops being a blind spot."
          primaryHref="/#pricing"
          primaryLabel="Replace the blind spot with independent monitoring"
          secondaryHref="/construction-activity-check"
          secondaryLabel="Try the free activity check"
        />

        <ToolFootnote b={{ label: "delay cost calculator", href: "/construction-delay-cost-calculator" }} />
      </div>
    </section>
  );
}
