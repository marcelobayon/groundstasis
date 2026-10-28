import type { Metadata } from "next";
import Link from "next/link";
import { DrawInspectionForm } from "@/components/tools/DrawInspectionForm";
import { ToolCta } from "@/components/tools/ToolCta";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { ToolFootnote } from "@/components/tools/ToolFootnote";

export const metadata: Metadata = {
  title: "Construction Draw Inspection Form (free template)",
  description:
    "A free, downloadable construction draw inspection form for lenders and inspectors. Fill it in and download, or print it blank: project and loan reference, reported stage, work reviewed, exceptions, and sign-off.",
  alternates: { canonical: "/construction-draw-inspection-form" },
};

const FAQ = [
  {
    q: "What is a construction draw inspection form?",
    a: "It is the document an inspector or lender uses to record what was confirmed at a site before releasing a construction-loan draw: the project and loan reference, the reported construction stage, the work actually reviewed on site, supporting documentation, any exceptions, and a reviewer sign-off.",
  },
  {
    q: "Is this draw inspection form free to download?",
    a: "Yes. Fill it in on this page and download a clean copy, or download it blank to print and complete on site. It works independently of Ground Stasis, and nothing you type leaves your device — the file is generated in your browser.",
  },
  {
    q: "How is reported information different from satellite observation?",
    a: "The fields on this form are completed by people on the project — the inspector, borrower, or contractor. They are reported and on-site-observed information. That is distinct from a satellite observation, which is an independent remote signal of whether the site is physically changing. Ground Stasis keeps reported and observed clearly separate.",
  },
  {
    q: "What should a draw inspection confirm?",
    a: "At minimum: that the reported stage matches what is visible on site, that the work supporting the draw is actually in place, that supporting documents (lien waivers, updated schedule, invoices) are present, and that any exceptions or incomplete items are noted for follow-up. The draw inspection checklist covers this in more detail.",
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
            { name: "Construction Draw Inspection Form", href: "/construction-draw-inspection-form" },
          ]}
        />
        <div className="eyebrow">Free template</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Construction draw inspection form</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 16 }}>
          A clean, usable draw inspection form for construction lenders and inspectors. Fill it in below and download a
          copy, or download it blank to print and complete on site.
        </p>

        <DrawInspectionForm />

        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 22 }}>How to use it</h2>
          <p className="muted">
            Use it at each draw to record what the inspection actually confirmed, keep a consistent documentation trail,
            and flag exceptions before funds release. For the full set of things a draw inspection should confirm, pair
            it with the <Link href="/construction-draw-inspection-checklist">construction draw inspection checklist</Link>.
            The form captures inspector- and borrower-reported information; it is not a satellite observation.
          </p>
        </div>

        <ToolCta
          heading="The form records the visit. What about between visits?"
          body="A draw inspection confirms a point in time. Ground Stasis watches the site by satellite in between and flags when it goes unusually quiet — so the gap between inspections stops being a blind spot. Prove it on one site for $9."
          primaryHref="/construction-activity-check"
          primaryLabel="Check a site for $9"
          secondaryHref="/construction-loan-monitoring"
          secondaryLabel="How construction loan monitoring works"
        />

        <p className="small muted" style={{ marginTop: 18 }}>
          Related:{" "}
          <Link href="/construction-draw-inspection-checklist">draw inspection checklist</Link> ·{" "}
          <Link href="/construction-loan-monitoring-checklist">loan monitoring checklist</Link> ·{" "}
          <Link href="/vet-monitor-builders-construction-lending-risk">vetting &amp; monitoring builders</Link> ·{" "}
          <Link href="/utility-construction-inspection-form">utility inspection form</Link>
        </p>

        <Faq items={FAQ} />
        <ToolFootnote />
      </div>
    </section>
  );
}
