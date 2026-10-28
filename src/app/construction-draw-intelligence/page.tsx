import type { Metadata } from "next";
import Link from "next/link";
import { CtaButton } from "@/components/cta";
import { CDI_LIMITATIONS } from "@/lib/cdi/findings";

export const metadata: Metadata = {
  title: "Construction Draw Intelligence",
  description:
    "Construction Draw Intelligence adds milestone context to Ground Stasis monitoring: compare the reported construction stage and draw schedule against what the satellite actually observed, and know what to investigate before the next draw.",
  alternates: { canonical: "/construction-draw-intelligence" },
};

const BENEFITS: [string, string][] = [
  ["Track reported milestones", "Record the construction stage, expected completion date, and upcoming draw milestones for each upgraded site."],
  ["Spot changes that warrant review", "Get alerts when observed site activity appears to have stalled or resumed — subject to available imagery and monitoring conditions."],
  ["Compare expectations with observations", "See the reported milestone alongside the physical changes detectable in available satellite imagery — reported and observed kept clearly separate."],
  ["Know what to investigate next", "Identify when updated site photos, contractor documentation, or an independent inspection may be warranted."],
  ["Keep an evidence timeline", "Review observation dates, detected changes, and monitoring history for the site in one place."],
];

export default function Page() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">Premium module · Ground Stasis</div>
          <h1>Does the evidence warrant a closer look before the next draw?</h1>
          <p className="lead">
            Ground Stasis answers one question: is construction still moving? Construction Draw Intelligence adds a
            second — does the available physical evidence appear consistent with the reported milestone and schedule?
          </p>
          <div className="hero-actions">
            <CtaButton href="/#pricing" event="draw_intelligence_offer_clicked" params={{ location: "cdi_hero" }}>
              Add Draw Intelligence — $15/mo per site
            </CtaButton>
            <CtaButton href="/construction-activity-check" event="cta_click" params={{ location: "cdi_hero_secondary" }} variant="secondary">
              Check a site for $9 first
            </CtaButton>
          </div>
          <p className="hero-note">
            It&rsquo;s an add-on to any monitoring plan — $15/month per upgraded site, on top of your $19, $49, or $99
            plan. Your $9 site check stays a one-time purchase.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="kicker">How it helps</div>
          <h2>Reported milestone, meet observed activity.</h2>
          <p className="body" style={{ marginTop: 12, maxWidth: "64ch" }}>
            You record what the borrower or contractor reports — the stage, the target date, the draw it supports. Ground
            Stasis compares that against what the satellite actually observed over time, and tells you when the two may
            not line up. It never claims to verify the work; it tells you where to look.
          </p>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            {BENEFITS.map(([h, p]) => (
              <div className="card" key={h}>
                <h3 style={{ marginBottom: 6 }}>{h}</h3>
                <p className="muted" style={{ margin: 0 }}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="kicker">How it works</div>
          <h2>Four steps, zero calls.</h2>
          <div className="grid grid-4">
            {[
              ["1", "Upgrade a site", "Add Draw Intelligence to a monitored site for $15/month during checkout or from the site workspace."],
              ["2", "Record the milestone", "Enter the reported stage, target date, and any draw reference in the secure site workspace."],
              ["3", "We compare", "Each monitoring cycle compares your reported milestone against the observed satellite activity."],
              ["4", "You get a finding", "A plain-language finding and a recommended next action — emailed, with a link back to the workspace."],
            ].map(([n, h, p]) => (
              <div className="card" key={n}>
                <span className="step-num">{n}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="kicker">What it is not</div>
          <h2>We&rsquo;re explicit about the limits.</h2>
          <p className="body" style={{ marginTop: 12, maxWidth: "70ch" }}>{CDI_LIMITATIONS}</p>
          <ul className="notlist">
            <li>It does not verify completed-work value, construction quality, code compliance, or contractor performance.</li>
            <li>It does not decide whether a draw should be released.</li>
            <li>Many milestones — interior MEP, inspections, finishes — are not visible from satellite and are reported as &ldquo;not independently verifiable.&rdquo;</li>
            <li>An alert, or a lack of detected activity, is not proof that a milestone was or wasn&rsquo;t met.</li>
          </ul>
        </div>
      </section>

      <section className="section alt" style={{ textAlign: "center" }}>
        <div className="container">
          <h2 style={{ margin: "0 auto", maxWidth: "24ch" }}>Add milestone context to the sites you already watch.</h2>
          <div className="hero-actions" style={{ justifyContent: "center", marginTop: 24 }}>
            <CtaButton href="/#pricing" event="draw_intelligence_offer_clicked" params={{ location: "cdi_footer" }}>
              See plans &amp; add Draw Intelligence
            </CtaButton>
            <Link className="btn btn-secondary" href="/construction-draw-inspection-checklist">
              Draw inspection checklist
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
