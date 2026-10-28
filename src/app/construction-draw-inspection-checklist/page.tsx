import type { Metadata } from "next";
import { Checklist, type ChecklistSection } from "@/components/tools/Checklist";
import { ToolCta } from "@/components/tools/ToolCta";

export const metadata: Metadata = {
  title: "Construction Draw Inspection Checklist (free)",
  description:
    "A free, printable construction draw inspection checklist: project identification, work in place, documentation, and an approve/hold recommendation. Print it for your draw file.",
  alternates: { canonical: "/construction-draw-inspection-checklist" },
};

const SECTIONS: ChecklistSection[] = [
  {
    title: "Project & draw identification",
    items: ["Project identification", "Draw amount requested", "Current construction phase", "Percent complete (this draw)"],
  },
  {
    title: "Work & materials",
    items: ["Work in place verified", "Stored materials documented", "Schedule of values reconciled", "Cost-to-complete updated"],
  },
  {
    title: "Documentation",
    items: ["Change orders reviewed", "Lien waivers collected", "Dated progress photos captured", "Inspector comments recorded"],
  },
  {
    title: "Decision",
    items: ["Exceptions noted", "Approve / hold recommendation made"],
  },
];

export default function Page() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="eyebrow">Free checklist</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Construction Draw Inspection Checklist</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 8 }}>
          What a draw inspection should confirm before funds are released. Check items off as you work — progress
          saves in this browser — or print it as a PDF for the draw file.
        </p>

        <Checklist storageKey="gs-checklist-draw-inspection" sections={SECTIONS} />

        <ToolCta
          heading="A draw inspection is a snapshot. The weeks between are a blind spot."
          body="An inspection confirms the site on one day. Ground Stasis watches the days in between — it compares the site over time from satellite observations and tells you when physical change has gone unusually quiet, so you know whether the next inspection can wait or needs to happen now."
          primaryHref="/construction-activity-check"
          primaryLabel="Check the site before the next draw"
          secondaryHref="/construction-draw-intelligence"
          secondaryLabel="Explore Construction Draw Intelligence"
        />
      </div>
    </section>
  );
}
