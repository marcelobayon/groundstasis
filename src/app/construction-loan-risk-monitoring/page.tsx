import type { Metadata } from "next";
import Link from "next/link";
import { SeoCta } from "@/components/seo-cta";

export const metadata: Metadata = {
  title: "Construction loan risk monitoring",
  description:
    "A stalled construction project is a leading indicator of loan risk. How an independent 'site has gone quiet' signal complements borrower reporting and draw documentation.",
  alternates: { canonical: "/construction-loan-risk-monitoring" },
};

export default function Page() {
  return (
    <section className="section">
      <div className="container prose">
        <div className="eyebrow">Guide</div>
        <h1 style={{ fontSize: 34, marginTop: 10 }}>Construction loan risk monitoring and the &ldquo;quiet site&rdquo; signal</h1>
        <p className="lead" style={{ color: "#334155" }}>
          On a construction loan, schedule is risk. A project that stops moving ties up capital, raises carrying costs,
          and can precede a workout. Catching a stall early gives you more options.
        </p>

        <p className="muted">
          Part of our guide to{" "}
          <Link href="/construction-loan-monitoring">construction loan monitoring</Link> — this page focuses on
          the stall-as-risk-indicator angle.
        </p>

        <h2>Why &ldquo;quiet&rdquo; matters</h2>
        <p>
          Most loss scenarios on construction loans start the same way: the physical work slows or stops while reporting
          lags. An independent signal that the site has gone unusually quiet — derived from something other than the
          borrower&rsquo;s own updates — is a useful early prompt to investigate.
        </p>

        <h2>How to use the signal</h2>
        <p>
          Treat a stasis flag as a trigger for review, not a conclusion. Pull the latest draw documentation, check in with
          the borrower, and decide whether an inspection is warranted. The signal&rsquo;s job is to move that decision
          earlier, not to make it for you.
        </p>

        <h2>Keeping it proportionate</h2>
        <p>
          A small lender doesn&rsquo;t need a full construction-intelligence platform to get this benefit. A narrow,
          low-cost monitoring layer that watches for one thing — the site going quiet — is often the right-sized tool.
        </p>

        <SeoCta />
      </div>
    </section>
  );
}
