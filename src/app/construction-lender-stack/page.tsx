import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ToolCta } from "@/components/tools/ToolCta";
import { TrackView } from "@/components/stack/TrackView";
import { AffiliateDisclosure } from "@/components/stack/AffiliateDisclosure";
import { publishedCategories } from "@/config/affiliates";

export const metadata: Metadata = {
  title: "The Construction Lender Stack — Tools for Construction Lenders",
  description:
    "A curated directory of the software and data tools construction lenders and capital providers use — site monitoring, property data, accounting, project management, and CRM — alongside Ground Stasis's own satellite monitoring.",
  alternates: { canonical: "/construction-lender-stack" },
};

const TAGLINE: Record<string, string> = {
  "site-monitoring": "Watch a financed site between inspections — our own tools.",
  "property-data": "Ownership, records, and parcel-level context.",
  accounting: "Bookkeeping for lenders and the builders they fund.",
  "project-management": "Coordinate the people and schedule on a project.",
  crm: "Borrower pipeline and follow-ups.",
};

export default function Page() {
  const cats = publishedCategories();

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 860 }}>
        <TrackView event="construction_lender_stack_view" />
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Construction Lender Stack", href: "/construction-lender-stack" },
          ]}
        />
        <div className="eyebrow">Construction lender stack</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>The Construction Lender Stack</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 18 }}>
          The software and data tools construction lenders, private lenders, and capital providers use to fund and
          manage construction loans — grouped by the job they do. Ground Stasis is the monitoring layer: an independent,
          between-inspection signal on whether a financed site is actually moving. It complements inspections, loan
          servicing, project management, and your own due diligence — it does not replace them. Some categories below are
          served by Ground Stasis directly; others point to complementary third-party tools, clearly labeled.
        </p>

        <h2 style={{ fontSize: 22 }}>Categories</h2>
        <div style={{ display: "grid", gap: 10, margin: "12px 0 24px" }}>
          {cats.map((c) => (
            <Link
              key={c.slug}
              href={`/construction-lender-stack/${c.slug}`}
              style={{
                display: "block",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: "14px 16px",
                textDecoration: "none",
                color: "#0A192F",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 17 }}>{c.name}</strong>
                {c.servedByGroundStasis && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      color: "#FF6B00",
                    }}
                  >
                    Served by Ground Stasis
                  </span>
                )}
              </div>
              <div className="small muted" style={{ color: "#64748B", marginTop: 2 }}>
                {TAGLINE[c.slug] ?? ""}
              </div>
            </Link>
          ))}
        </div>

        <h2 style={{ fontSize: 22 }}>Start with the monitoring layer</h2>
        <p className="muted">
          The one part of this stack Ground Stasis serves directly is the signal on whether the site itself is moving.
          Prove it on a single financed site, then monitor continuously if it&rsquo;s useful.
        </p>
        <ToolCta
          heading="See the signal on a real site"
          body="Run a one-time satellite activity check on one site for $9, then monitor continuously from $19/month. Imagery availability varies with satellite acquisition and weather."
          primaryHref="/construction-activity-check"
          primaryLabel="Check a site for $9"
          secondaryHref="/construction-loan-monitoring"
          secondaryLabel="How monitoring works"
        />

        <h2 style={{ fontSize: 20, marginTop: 8 }}>How this directory works</h2>
        <p className="small muted">
          Ground Stasis tools link into our own product. Third-party tools are prospective complements — not integrations
          or endorsements — and link to each company&rsquo;s official site. Monetized links are labeled where they
          appear. See also <Link href="/integrations/zapier">our Zapier integration</Link> for connecting Ground Stasis
          to the tools below, and <Link href="/tools">our free tools for lenders</Link>.
        </p>

        <AffiliateDisclosure />
      </div>
    </section>
  );
}
