import type { Metadata } from "next";
import { Checklist, type ChecklistSection } from "@/components/tools/Checklist";
import { ToolCta } from "@/components/tools/ToolCta";

export const metadata: Metadata = {
  title: "Construction Loan Monitoring Checklist (free)",
  description:
    "A free, printable checklist of the controls lenders use to monitor a construction loan — from pre-closing through every draw. Includes the one item you can't verify from your desk.",
  alternates: { canonical: "/construction-loan-monitoring-checklist" },
};

const SECTIONS: ChecklistSection[] = [
  {
    title: "Before closing",
    items: [
      "Approved plans on file",
      "Construction budget reviewed",
      "Construction schedule reviewed",
      "Contractor agreement executed",
      "Permits verified",
      "Builder's risk / liability insurance in place",
      "Contingency adequate",
      "Interest reserve funded",
    ],
  },
  {
    title: "Before each draw",
    items: [
      "Draw request received",
      "Schedule of values reconciled",
      "Work completed verified",
      "Stored materials documented",
      "Lien waivers collected",
      "Change orders reviewed",
      "Cost-to-complete updated",
      "Site inspection ordered",
      "Dated progress photos on file",
      "Remaining budget confirmed",
    ],
  },
  {
    title: "Between inspections — remote activity",
    items: [
      "Is there independent evidence that physical construction has continued since the last inspection?",
    ],
  },
];

export default function Page() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="eyebrow">Free checklist</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Construction Loan Monitoring Checklist</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 8 }}>
          The controls a construction lender runs from pre-closing through every draw. Check items off as
          you go — your progress is saved in this browser — or print it as a PDF for your loan file.
        </p>

        <Checklist storageKey="gs-checklist-monitoring" sections={SECTIONS} />

        <ToolCta
          heading="One line on this list can't be done from your desk."
          body="Every item except the last is paperwork and periodic visits. The remote-activity line — is the site actually still moving between inspections? — is the blind spot. That single line is the one thing Ground Stasis watches continuously, from satellite observations, and flags when a project goes unusually quiet."
          primaryHref="/construction-monitoring-gap-calculator"
          primaryLabel="Calculate your monitoring gap"
          secondaryHref="/#pricing"
          secondaryLabel="Check a construction site for $9"
        />
      </div>
    </section>
  );
}
