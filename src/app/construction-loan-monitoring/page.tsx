import type { Metadata } from "next";
import Link from "next/link";
import { ToolCta } from "@/components/tools/ToolCta";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { ToolFootnote } from "@/components/tools/ToolFootnote";

export const metadata: Metadata = {
  title: "Construction Loan Monitoring",
  description:
    "Construction loan monitoring explained for lenders: the controls between closing and payoff, the gap between draw inspections, and how a remote 'has the site gone quiet?' signal fits alongside them.",
  alternates: { canonical: "/construction-loan-monitoring" },
};

const FAQ = [
  {
    q: "What is construction loan monitoring?",
    a: "Construction loan monitoring is how a lender confirms, between closing and payoff, that a financed project is actually progressing and that funds are being used as intended. In practice it combines borrower reporting, draw inspections, fund control, and — increasingly — independent remote signals such as satellite observation.",
  },
  {
    q: "How is monitoring different from a draw inspection?",
    a: "A draw inspection is a point-in-time physical visit tied to a specific funding request. Monitoring is the continuous question between those visits: is the project still moving? Inspections are events; monitoring is the stretch in between, which is where a quiet project can go unnoticed.",
  },
  {
    q: "Does satellite monitoring replace inspections or fund control?",
    a: "No. It is a supplemental signal, not a replacement for physical inspection, fund control, appraisal, engineering review, or underwriting judgment. It tells you when a site deserves a closer look; the established controls still do the verifying.",
  },
  {
    q: "What does construction loan monitoring cost with Ground Stasis?",
    a: "You can prove it on one site for a one-time $9 satellite check, then watch a site continuously from $19/month (1 site), $49/month (3 sites), or $99/month (10 sites). Construction Draw Intelligence is an optional $15/month-per-site add-on. Imagery availability varies with satellite acquisition and weather.",
  },
];

export default function Page() {
  return (
    <section className="section">
      <div className="container">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Construction loan monitoring", href: "/construction-loan-monitoring" },
          ]}
        />
        <div className="prose">
          <div className="eyebrow">Guide</div>
          <h1 style={{ fontSize: 34, marginTop: 10 }}>Construction loan monitoring</h1>
          <p className="lead" style={{ color: "#334155" }}>
            On a construction loan, the money goes out in stages against work that is supposed to be getting done.
            Construction loan monitoring is everything a lender does between closing and payoff to confirm that the
            project is actually progressing — and to catch it early when it is not.
          </p>

          <h2>What monitoring actually covers</h2>
          <p>
            Monitoring is not a single tool; it is a stack of overlapping controls, each answering a slightly different
            question:
          </p>
          <ul>
            <li>
              <strong>Borrower reporting</strong> — progress updates and draw requests from the borrower or general
              contractor. Useful, but self-reported and often late.
            </li>
            <li>
              <strong>Draw inspections</strong> — a third party physically confirms progress before funds release. Point
              in time, and only as frequent as your draw schedule.
            </li>
            <li>
              <strong>Fund control / disbursement control</strong> — a neutral party holds and releases funds against
              documented progress, lien waivers, and budgets.
            </li>
            <li>
              <strong>Independent remote signals</strong> — evidence that does not depend on the borrower, such as
              satellite observation of whether the site is physically changing over time.
            </li>
          </ul>

          <h2>The gap between inspections</h2>
          <p>
            Inspections are periodic and draws are borrower-initiated. A project can stall shortly after a draw and you
            may not learn about it until the next scheduled touchpoint — weeks later, with interest still accruing on
            collateral that is not getting built. That stretch between touchpoints is the monitoring gap, and it is the
            single most common place construction-loan risk hides. You can put a number on your own exposure with the{" "}
            <Link href="/construction-monitoring-gap-calculator">monitoring gap calculator</Link>, and on the cost of a
            stall with the <Link href="/construction-delay-cost-calculator">delay cost calculator</Link>.
          </p>

          <h2>Where a remote signal fits</h2>
          <p>
            A lightweight remote monitoring layer watches the property between inspections and flags when observable
            change drops off. It does not replace your existing controls — it narrows the window in which a stall can go
            unnoticed, so your inspections and fund-control decisions are triggered by evidence rather than the calendar.
            Ground Stasis is built to do exactly one thing here: tell you when a financed site has gone unusually quiet.
          </p>
          <p>
            You can start with a one-time <Link href="/construction-activity-check">$9 single-site check</Link> — a
            single live satellite read of one site, with no subscription — and move to continuous monitoring only if you
            want it. For milestone context on the sites you choose, the optional{" "}
            <Link href="/construction-draw-intelligence">Construction Draw Intelligence</Link> add-on compares a reported
            stage against what the satellite observed, keeping reported and observed clearly separate.
          </p>

          <h2>What a remote signal cannot do</h2>
          <p>
            Honest monitoring is explicit about its limits. A lack of detected activity is not proof that construction
            has stopped — only that observable change looks unusually low. An observed change does not prove completed
            work, value, or quality. Imagery resolution, revisit frequency, cloud cover, and site conditions all limit
            what a satellite can see, and a cloudy or missing image is reported as a data gap, never as inactivity.
            Satellite monitoring supplements physical inspection, fund control, and underwriting judgment; it does not
            replace them.
          </p>

          <h2>Keep reading</h2>
          <ul>
            <li>
              <Link href="/construction-lender-monitoring">Construction lender monitoring without the enterprise platform</Link>{" "}
              — right-sizing monitoring for a small book of loans.
            </li>
            <li>
              <Link href="/construction-loan-risk-monitoring">Construction loan risk monitoring and the &ldquo;quiet site&rdquo; signal</Link>{" "}
              — why a stall is a leading risk indicator.
            </li>
            <li>
              <Link href="/satellite-construction-monitoring">Satellite construction monitoring, explained</Link> — the
              data, the indices, and the limits.
            </li>
            <li>
              <Link href="/construction-loan-monitoring-checklist">Construction loan monitoring checklist</Link> — the
              controls to run from pre-closing through every draw.
            </li>
          </ul>

          <h2>Construction loan monitoring by market</h2>
          <p className="small muted">
            <Link href="/construction-loan-monitoring/new-york">New York</Link> ·{" "}
            <Link href="/construction-loan-monitoring/new-england">New England</Link> ·{" "}
            <Link href="/construction-loan-monitoring/dallas-fort-worth">Dallas–Fort Worth</Link> ·{" "}
            <Link href="/construction-loan-monitoring/atlanta">Atlanta</Link> ·{" "}
            <Link href="/construction-loan-monitoring/charleston-sc">Charleston, SC</Link> ·{" "}
            <Link href="/construction-loan-monitoring/greenville-sc">Greenville, SC</Link> ·{" "}
            <Link href="/construction-loan-monitoring/boise">Boise</Link> ·{" "}
            <Link href="/construction-loan-monitoring/charlotte">Charlotte</Link> ·{" "}
            <Link href="/construction-loan-monitoring/houston">Houston</Link> ·{" "}
            <Link href="/construction-loan-monitoring/austin">Austin</Link> ·{" "}
            <Link href="/construction-loan-monitoring/phoenix">Phoenix</Link> ·{" "}
            <Link href="/construction-loan-monitoring/detroit">Detroit</Link>
          </p>
        </div>

        <ToolCta
          heading="Close the gap between inspections."
          body="Ground Stasis watches your financed sites by satellite and flags when one goes unusually quiet — so a stall is an email this week, not a surprise at the next draw. Prove it on one site for $9, then monitor from $19/month."
          primaryHref="/construction-activity-check"
          primaryLabel="Check a site for $9"
          secondaryHref="/#pricing"
          secondaryLabel="See monitoring plans"
        />

        <div className="container" style={{ padding: 0, maxWidth: 820 }}>
          <Faq items={FAQ} />
        <ToolFootnote />
        </div>
      </div>
    </section>
  );
}
