import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ToolCta } from "@/components/tools/ToolCta";
import { TrackView } from "@/components/stack/TrackView";
import { PartnerCard } from "@/components/stack/PartnerCard";
import { AffiliateDisclosure } from "@/components/stack/AffiliateDisclosure";
import { getCategory, publishedCategories } from "@/config/affiliates";

// Static category pages only; unknown slugs 404 (no unbounded doorway surface).
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedCategories().map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const c = getCategory(params.category);
  if (!c) return {};
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `/construction-lender-stack/${c.slug}` },
  };
}

export default function Page({ params }: { params: { category: string } }) {
  const c = getCategory(params.category);
  if (!c) notFound();

  const hasExternal = c.partners.some((p) => !p.isGroundStasis);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <TrackView event="resource_category_view" params={{ category: c.slug }} />
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Construction Lender Stack", href: "/construction-lender-stack" },
            { name: c.name, href: `/construction-lender-stack/${c.slug}` },
          ]}
        />
        <div className="eyebrow">Construction lender stack</div>
        <h1 style={{ fontSize: 32, margin: "10px 0 8px" }}>{c.h1}</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 18 }}>
          {c.intro}
        </p>

        {c.partners.map((p) => (
          <PartnerCard key={p.id} partner={p} categorySlug={c.slug} />
        ))}

        {hasExternal && <AffiliateDisclosure />}

        {c.faqs.length > 0 && (
          <>
            <h2 style={{ fontSize: 20, marginTop: 26 }}>FAQ</h2>
            {c.faqs.map((f, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <strong>{f.q}</strong>
                <p className="small muted" style={{ color: "#475569", margin: "4px 0 0" }}>
                  {f.a}
                </p>
              </div>
            ))}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
            />
          </>
        )}

        {!c.servedByGroundStasis && (
          <ToolCta
            heading="These sit around the loan — Ground Stasis watches the site"
            body="The tools above support the business of lending. Ground Stasis watches whether the financed site is actually moving: a one-time $9 satellite check, then monitoring from $19/month."
            primaryHref="/construction-activity-check"
            primaryLabel="Check a site for $9"
            secondaryHref="/construction-lender-stack"
            secondaryLabel="Back to the stack"
          />
        )}

        <p className="small muted" style={{ marginTop: 20 }}>
          <Link href="/construction-lender-stack">← All stack categories</Link> ·{" "}
          <Link href="/construction-loan-monitoring">How monitoring works</Link> ·{" "}
          <Link href="/tools">Free tools for lenders</Link>
        </p>
      </div>
    </section>
  );
}
