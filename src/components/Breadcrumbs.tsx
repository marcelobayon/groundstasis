import * as React from "react";
import Link from "next/link";
import { SITE } from "@/lib/config/site";

export interface Crumb {
  /** Visible label. */
  name: string;
  /** Site-relative path, e.g. "/tools". The last crumb is the current page. */
  href: string;
}

/**
 * Visible breadcrumb trail + matching BreadcrumbList JSON-LD from one source.
 * The last item renders as the current page (not a link) and carries
 * aria-current. Reusable across all SEO tiers.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="gs-breadcrumbs" style={{ fontSize: 14, marginBottom: 12 }}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={c.href}>
            {i > 0 ? (
              <span aria-hidden="true" style={{ color: "#94a3b8", margin: "0 8px" }}>
                /
              </span>
            ) : null}
            {last ? (
              <span aria-current="page" style={{ color: "#334155" }}>
                {c.name}
              </span>
            ) : (
              <Link href={c.href} style={{ color: "#64748b" }}>
                {c.name}
              </Link>
            )}
          </span>
        );
      })}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: items.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.name,
              item: `${SITE.url}${c.href}`,
            })),
          }),
        }}
      />
    </nav>
  );
}
