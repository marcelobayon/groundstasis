import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolCta } from "@/components/tools/ToolCta";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ToolFootnote } from "@/components/tools/ToolFootnote";
import { MARKET_LOCATIONS, getMarket } from "@/lib/seo/locations";

// Static market pages only — unknown slugs 404 rather than generating an
// unbounded doorway surface.
export const dynamicParams = false;

export function generateStaticParams() {
  return MARKET_LOCATIONS.map((m) => ({ location: m.slug }));
}

export function generateMetadata({ params }: { params: { location: string } }): Metadata {
  const m = getMarket(params.location);
  if (!m) return {};
  return {
    title: `Construction Loan Monitoring in ${m.city}`,
    description: `Construction loan monitoring for lenders in ${m.city}, ${m.region}: how an independent satellite signal flags when a financed site goes quiet between draw inspections. Prove it on one site for $9.`,
    alternates: { canonical: `/construction-loan-monitoring/${m.slug}` },
  };
}

export default function Page({ params }: { params: { location: string } }) {
  const m = getMarket(params.location);
  if (!m) notFound();

  const others = MARKET_LOCATIONS.filter((x) => x.slug !== m.slug).slice(0, 6);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Construction loan monitoring", href: "/construction-loan-monitoring" },
            { name: m.city, href: `/construction-loan-monitoring/${m.slug}` },
          ]}
        />
        <div className="eyebrow">Construction loan monitoring</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Construction loan monitoring in {m.city}</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 16 }}>
          {m.blurb} For a construction lender, that activity is also exposure — the stretch between draw inspections is
          when a financed site can quietly stall without anyone noticing.
        </p>

        <h2 style={{ fontSize: 22 }}>Watching a {m.city} site between inspections</h2>
        <p className="muted">
          Ground Stasis watches a financed site by satellite and flags when it goes unusually quiet — an independent
          signal that sits alongside your draw inspections, fund control, and borrower reporting, not in place of them.
          The monitoring is the same in every market; what changes is how much is being built, and {m.city} has plenty.
          Here&rsquo;s <Link href="/construction-loan-monitoring">how construction loan monitoring works</Link>.
        </p>

        <ToolCta
          heading={`Prove it on one ${m.city} site`}
          body="Run a one-time satellite activity check on a single site for $9, then monitor continuously from $19/month if it's useful. Imagery availability varies with satellite acquisition and weather."
          primaryHref="/construction-activity-check"
          primaryLabel="Check a site for $9"
          secondaryHref="/construction-loan-monitoring"
          secondaryLabel="How monitoring works"
        />

        <h2 style={{ fontSize: 20, marginTop: 8 }}>Free tools for lenders</h2>
        <p className="small muted">
          <Link href="/construction-loan-monitoring-checklist">Monitoring checklist</Link> ·{" "}
          <Link href="/construction-draw-inspection-form">Draw inspection form</Link> ·{" "}
          <Link href="/construction-delay-cost-calculator">Delay cost calculator</Link> ·{" "}
          <Link href="/construction-monitoring-gap-calculator">Monitoring gap calculator</Link>
        </p>

        <h2 style={{ fontSize: 20, marginTop: 18 }}>Other markets</h2>
        <p className="small muted">
          {others.map((o, i) => (
            <span key={o.slug}>
              {i > 0 ? " · " : ""}
              <Link href={`/construction-loan-monitoring/${o.slug}`}>{o.city}</Link>
            </span>
          ))}
        </p>

        <ToolFootnote />
      </div>
    </section>
  );
}
