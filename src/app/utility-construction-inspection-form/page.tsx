import type { Metadata } from "next";
import Link from "next/link";
import { UtilityInspectionForm } from "@/components/tools/UtilityInspectionForm";
import { ToolCta } from "@/components/tools/ToolCta";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { ToolFootnote } from "@/components/tools/ToolFootnote";

export const metadata: Metadata = {
  title: "Utility Construction Inspection Form (free template)",
  description:
    "A free, downloadable utility construction inspection form for wet and dry utilities — water, sewer, storm, gas, electric, and conduit. Record trench, bedding, depth of cover, testing, compaction, restoration, and sign-off. Fill in and download, or print blank.",
  alternates: { canonical: "/utility-construction-inspection-form" },
};

const FAQ = [
  {
    q: "What is a utility construction inspection form?",
    a: "It is the document an inspector or contractor uses to record what was confirmed when a utility was installed: the segment or station, the utility type and material, trench depth and depth of cover, bedding, joints, separation from other utilities, any pressure/mandrel/compaction testing, surface restoration, supporting documentation, exceptions, and a sign-off.",
  },
  {
    q: "Is this utility inspection form free to download?",
    a: "Yes. Fill it in on this page and download a clean copy, or download it blank to print and complete in the field. It works independently of Ground Stasis, and nothing you type leaves your device — the file is generated in your browser.",
  },
  {
    q: "What should a utility construction inspection cover?",
    a: "For wet utilities (water, sewer, storm): line and grade, bedding and haunching, joints, depth of cover, and the required test — pressure for water, mandrel/deflection and often a leakage test for gravity sewer. For dry utilities (electric, gas, telecom, conduit): depth, separation and clearances, warning tape, and backfill compaction. Across both: an 811 locate before digging, density/compaction on backfill, and surface restoration.",
  },
  {
    q: "How does this relate to construction loan monitoring?",
    a: "Underground utilities and sitework are early, high-value draw stages, and once they are backfilled they are invisible — so the inspection record is the evidence. The fields here are inspector- and contractor-reported; that is distinct from a satellite observation, which is an independent remote signal of whether the site is physically changing between inspections. Ground Stasis keeps reported and observed clearly separate.",
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
            { name: "Utility Construction Inspection Form", href: "/utility-construction-inspection-form" },
          ]}
        />
        <div className="eyebrow">Free template</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Utility construction inspection form</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 16 }}>
          A clean, usable inspection form for wet and dry utility construction — water, sewer, storm, gas, electric, and
          conduit. Fill it in below and download a copy, or download it blank to print and complete in the field.
        </p>

        <UtilityInspectionForm />

        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 22 }}>How to use it</h2>
          <p className="muted">
            Use it as each utility run is installed and before it is backfilled, to record what the inspection actually
            confirmed — trench and cover, bedding, joints, testing, compaction, and restoration — and to flag exceptions
            before the stage is covered up. Pair it with the{" "}
            <Link href="/construction-draw-inspection-form">construction draw inspection form</Link> for the draw itself.
            The form captures inspector- and contractor-reported information; it is not a satellite observation.
          </p>
        </div>

        <ToolCta
          heading="The form records the visit. What about between visits?"
          body="An inspection confirms a point in time. Ground Stasis watches the site by satellite in between and flags when it goes unusually quiet — so the gap between inspections stops being a blind spot. Prove it on one site for $9."
          primaryHref="/construction-activity-check"
          primaryLabel="Check a site for $9"
          secondaryHref="/construction-loan-monitoring"
          secondaryLabel="How construction loan monitoring works"
        />

        <p className="small muted" style={{ marginTop: 18 }}>
          Related:{" "}
          <Link href="/construction-draw-inspection-form">draw inspection form</Link> ·{" "}
          <Link href="/construction-draw-inspection-checklist">draw inspection checklist</Link> ·{" "}
          <Link href="/construction-loan-monitoring-checklist">loan monitoring checklist</Link>
        </p>

        <Faq items={FAQ} />
        <ToolFootnote />
      </div>
    </section>
  );
}
