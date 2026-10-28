import type { Metadata } from "next";
import Link from "next/link";
import { ToolCta } from "@/components/tools/ToolCta";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { ToolFootnote } from "@/components/tools/ToolFootnote";

export const metadata: Metadata = {
  title: "How to Vet and Monitor Builders for Construction Lending Risk",
  description:
    "A practical lender's guide to vetting builders before you fund and monitoring them through construction: due diligence, draw inspections, warning signs, monitoring gaps, and where remote satellite observation helps.",
  alternates: { canonical: "/vet-monitor-builders-construction-lending-risk" },
};

const FAQ = [
  {
    q: "How do you vet a builder before financing construction?",
    a: "Review track record on comparable projects, financial capacity and liquidity, licensing and insurance, references from past lenders and suppliers, current pipeline and whether they are overcommitted, and any lien or litigation history. The goal is to understand whether this builder can finish this project on this timeline.",
  },
  {
    q: "What are the warning signs a construction project is in trouble?",
    a: "Common signals include slipping draw timing, requests that outpace visible progress, subcontractor or supplier complaints, lien filings, slow responses, and a site that looks unchanged between visits. No single signal is proof — they are prompts to look closer.",
  },
  {
    q: "Can satellite monitoring tell me if a builder has stopped working?",
    a: "It can tell you when observable change at a site has dropped off unusually — which is a strong prompt to investigate — but it cannot prove work has stopped or explain why. Clouds, resolution, and revisit frequency all limit it, and a missing image is a data gap, not inactivity. It complements inspections and reporting; it does not replace them.",
  },
  {
    q: "How often should I monitor an active construction loan?",
    a: "Inspection cadence depends on lender policy, project risk, stage, and draw schedule — there is no universal interval. The practical aim is to keep the gap between independent confirmations short enough that a stall cannot hide for long. A continuous remote signal between inspections is one way to shrink that gap.",
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
            { name: "Vetting & monitoring builders", href: "/vet-monitor-builders-construction-lending-risk" },
          ]}
        />
        <div className="prose">
          <div className="eyebrow">Guide</div>
          <h1 style={{ fontSize: 34, marginTop: 10 }}>How to vet and monitor builders for construction lending risk</h1>
          <p className="lead" style={{ color: "#334155" }}>
            On a construction loan, your exposure is mostly the builder and the schedule. Underwriting the borrower is
            only half the job; the other half is confirming, through construction, that the project keeps moving. This
            is a practical playbook for both — vetting before you fund, and monitoring after.
          </p>

          <h2>Before you fund: builder due diligence</h2>
          <p>Work through the builder&rsquo;s ability to finish this specific project on this specific timeline:</p>
          <ul>
            <li><strong>Track record</strong> — completed projects of comparable type, size, and complexity; on-time and on-budget history.</li>
            <li><strong>Financial capacity</strong> — liquidity to carry the job, not just the margin on it; bonding capacity where relevant.</li>
            <li><strong>Licensing &amp; insurance</strong> — current license for the work and jurisdiction; general liability and builder&rsquo;s risk coverage.</li>
            <li><strong>References</strong> — past lenders, suppliers, and subcontractors, not just the borrower&rsquo;s chosen references.</li>
            <li><strong>Current pipeline</strong> — how many active jobs the builder is carrying, and whether they are overcommitted on crews or capital.</li>
            <li><strong>Lien &amp; litigation history</strong> — mechanic&rsquo;s liens, payment disputes, and unresolved claims.</li>
          </ul>

          <h2>Structure the loan to reduce risk</h2>
          <p>
            Good structure makes monitoring easier later: a realistic draw schedule tied to verifiable milestones,
            appropriate retainage, fund control for disbursements, lien-waiver collection at each draw, and an
            inspection cadence matched to project risk. Model the numbers with the{" "}
            <Link href="/construction-delay-cost-calculator">delay cost calculator</Link> and the{" "}
            <Link href="/construction-escalation-calculator">escalation calculator</Link> so you know what time actually
            costs on this loan.
          </p>

          <h2>During construction: ongoing monitoring</h2>
          <p>Monitoring is the stack of controls that confirm progress between closing and payoff:</p>
          <ul>
            <li><strong>Draw inspections &amp; documentation</strong> — a third party confirms progress before funds release. Keep a consistent record; the <Link href="/construction-draw-inspection-form">draw inspection form</Link> and <Link href="/construction-draw-inspection-checklist">draw inspection checklist</Link> help standardize it.</li>
            <li><strong>Borrower reporting</strong> — useful context, but self-reported and often lagging; treat it as a claim to verify, not evidence.</li>
            <li><strong>Independent remote signals</strong> — evidence that does not depend on the borrower, such as satellite observation of whether the site is physically changing.</li>
          </ul>

          <h2>Warning signs and monitoring gaps</h2>
          <p>
            The dangerous pattern is quiet: draw requests that outpace visible progress, slipping timelines, subcontractor
            or supplier complaints, new lien filings, and a site that looks unchanged between visits. The structural
            problem underneath most of these is the <Link href="/construction-monitoring-gap-calculator">monitoring gap</Link> —
            the stretch between independent confirmations where a stall can hide. Shrinking that gap is the single most
            effective monitoring improvement most small lenders can make.
          </p>

          <h2>How physical inspection and remote observation complement each other</h2>
          <p>
            They answer different questions. A physical inspection verifies <em>what</em> was built and to what quality —
            something a satellite cannot do. A remote signal watches <em>continuously and cheaply</em> for whether the
            site is still changing at all — something an inspector cannot do between visits. Used together, the remote
            signal tells you <em>when</em> to send the inspector, and the inspector tells you <em>what is actually there</em>.
          </p>

          <h2>Where satellite observation helps — and where it cannot establish facts</h2>
          <p>
            Satellite monitoring is well suited to detecting that a sizeable site has gone unusually quiet over time. It
            is not suited to proving work stopped, measuring completed value, or judging quality, and it is limited by
            resolution, revisit frequency, and cloud cover. A missing or cloudy image is a data gap — never evidence of
            inactivity. See <Link href="/satellite-construction-monitoring">satellite construction monitoring</Link> for
            the data and its limits. None of this replaces inspections, appraisals, engineering review, fund control, or
            your own underwriting judgment.
          </p>

          <h2>A practical lender checklist</h2>
          <ul>
            <li>Vet track record, liquidity, licensing/insurance, references, pipeline, and lien history before funding.</li>
            <li>Tie the draw schedule to verifiable milestones; hold appropriate retainage; use fund control.</li>
            <li>Standardize draw inspections and keep a consistent documentation trail.</li>
            <li>Define your inspection cadence by project risk — and measure the gap it leaves.</li>
            <li>Add an independent signal between inspections so a stall cannot hide to the next draw.</li>
            <li>Treat any flag as a trigger to investigate, not a conclusion.</li>
          </ul>
        </div>

        <ToolCta
          heading="Vetting gets you a good loan. Monitoring keeps it one."
          body="Even a well-vetted builder can stall. Ground Stasis watches your financed sites by satellite between inspections and flags when one goes unusually quiet — so you investigate on evidence, early. Prove it on one site for $9."
          primaryHref="/construction-activity-check"
          primaryLabel="Check a site for $9"
          secondaryHref="/construction-loan-monitoring"
          secondaryLabel="How construction loan monitoring works"
        />

        <div className="container" style={{ padding: 0, maxWidth: 820 }}>
          <Faq items={FAQ} />
        <ToolFootnote />
        </div>
      </div>
    </section>
  );
}
