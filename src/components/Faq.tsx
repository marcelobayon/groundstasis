import * as React from "react";

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Renders a visible FAQ list AND the matching FAQPage JSON-LD from a single
 * source array, so the structured data can never drift from what is actually on
 * the page (Google discounts FAQ markup that does not match visible content).
 *
 * Width-agnostic single column so it works inside both the narrow tool layout
 * (maxWidth ~820) and full-width content pages. Reusable across all SEO tiers.
 */
export function Faq({
  items,
  heading = "FAQ",
  title = "Common questions",
}: {
  items: FaqItem[];
  heading?: string;
  title?: string;
}) {
  if (!items.length) return null;
  return (
    <div className="gs-faq" style={{ marginTop: 36 }}>
      <div className="eyebrow">{heading}</div>
      <h2 style={{ fontSize: 26, margin: "8px 0 14px" }}>{title}</h2>
      <div>
        {items.map((f) => (
          <div key={f.q} style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 6 }}>{f.q}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {f.a}
            </p>
          </div>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </div>
  );
}
