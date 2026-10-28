import type { Metadata } from "next";
import Link from "next/link";
import { SeoCta } from "@/components/seo-cta";

export const metadata: Metadata = {
  title: "Construction lender monitoring",
  description:
    "What satellite-based monitoring can and cannot do for construction lenders, and how a narrow 'has the site gone quiet?' signal fits alongside inspections and draw management.",
  alternates: { canonical: "/construction-lender-monitoring" },
};

export default function Page() {
  return (
    <section className="section">
      <div className="container prose">
        <div className="eyebrow">Guide</div>
        <h1 style={{ fontSize: 34, marginTop: 10 }}>Construction lender monitoring, without the enterprise platform</h1>
        <p className="lead" style={{ color: "#334155" }}>
          If you lend against construction, your exposure lives in whether the project keeps moving. Between inspections
          and draw requests, you are largely trusting borrower reporting. Satellite monitoring can add one independent
          data point: whether the site is still visibly changing.
        </p>

        <p className="muted">
          Part of our guide to{" "}
          <Link href="/construction-loan-monitoring">construction loan monitoring</Link> — this page focuses on
          right-sizing monitoring for a small book of loans.
        </p>

        <h2>The gap monitoring fills</h2>
        <p>
          Inspections are periodic and draws are borrower-initiated. A project can stall shortly after a draw and you may
          not learn about it until the next scheduled touchpoint. A lightweight satellite signal watches the property
          between those touchpoints and flags when observable change drops off.
        </p>

        <h2>What it is not</h2>
        <p>
          Satellite monitoring is not a replacement for inspections, appraisals, or engineering review, and it cannot
          prove that construction has stopped or confirm why. It is a supplementary signal that tells you when a site
          deserves a closer look. Honest monitoring also distinguishes &ldquo;we can&rsquo;t see the site right now&rdquo;
          (clouds, no clean pass) from &ldquo;nothing is happening.&rdquo;
        </p>

        <h2>Who it fits</h2>
        <p>
          Private and hard-money lenders, bridge lenders, commercial real-estate lenders, and small debt funds with a
          handful to a few dozen construction loans — the lenders who can&rsquo;t justify an enterprise construction-
          intelligence platform but still carry real timeline risk.
        </p>

        <SeoCta />
      </div>
    </section>
  );
}
