import * as React from "react";
import Link from "next/link";

type FootLink = { label: string; href: string };

/**
 * The "New here?" onboarding + candor line shared across the free SEO tools.
 * Points newcomers at a couple of starter resources and restates the product
 * boundary (independent signal; doesn't replace inspections; never claims a
 * project has stopped). Defaults to the monitoring checklist + gap calculator;
 * override `a`/`b` on pages where a default link would point at itself.
 */
export function ToolFootnote({
  a = { label: "monitoring checklist", href: "/construction-loan-monitoring-checklist" },
  b = { label: "gap calculator", href: "/construction-monitoring-gap-calculator" },
}: {
  a?: FootLink;
  b?: FootLink;
}) {
  return (
    <p className="small muted" style={{ marginTop: 20 }}>
      New here? Start with the free <Link href={a.href}>{a.label}</Link> or the{" "}
      <Link href={b.href}>{b.label}</Link>. Ground Stasis is an independent monitoring signal — it doesn&rsquo;t
      replace inspections, and it never claims a project has stopped.
    </p>
  );
}
