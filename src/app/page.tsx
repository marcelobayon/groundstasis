import * as React from "react";
import { CtaButton } from "@/components/cta";
import { PageView } from "@/components/pageview";
import { PricingSection } from "@/components/pricing-section";
import { SITE } from "@/lib/config/site";

const FAQ: { q: string; a: string }[] = [
  {
    q: "What exactly does Ground Stasis detect?",
    a: "It detects periods of unusually low observed change at a construction site, relative to that site's own established baseline. When recent satellite observations show materially less site-level change than the site normally produced, Ground Stasis flags it for your review. It detects changes consistent with construction activity — it does not measure construction directly.",
  },
  {
    q: "Does this replace site inspections?",
    a: "No. Ground Stasis is an independent monitoring signal, not a replacement for physical inspection, appraisal, engineering review, or underwriting judgment. It helps you decide when a site deserves another look.",
  },
  {
    q: "How often will I receive imagery?",
    a: "Monitoring is based on Copernicus Sentinel-2, which revisits most locations every few days — but clouds, haze, snow, and acquisition conditions mean a usable, clear observation is not guaranteed on any given pass. Imagery availability varies with satellite acquisition and weather.",
  },
  {
    q: "What size site works best?",
    a: "Ground Stasis works best on larger construction sites where physical changes cover multiple satellite pixels. Sentinel-2 is 10 m-class imagery, so very small sites may be flagged as having limited or insufficient satellite suitability.",
  },
  {
    q: "Is the $9 check a subscription?",
    a: "No. The $9 single-site check is a one-time purchase. It does not enroll you in anything. Continuous monitoring is a separate, optional subscription you start only if you want it.",
  },
  {
    q: "What happens when it's too cloudy to see the site?",
    a: "Ground Stasis reports a DATA GAP rather than guessing. 'No usable data' is never treated as 'no activity' — that distinction is a core trust feature of the product.",
  },
];

export default function LandingPage() {
  return (
    <>
      <PageView event="landing_view" />

      {/* FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      {/* SoftwareApplication structured data (homepage only) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: SITE.name,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: SITE.url,
            description: SITE.subheadline,
            offers: [
              { "@type": "Offer", name: "Single-site satellite check (one-time)", price: "9", priceCurrency: "USD" },
              { "@type": "Offer", name: "Foundation — 1 site / month", price: "19", priceCurrency: "USD" },
              { "@type": "Offer", name: "Portfolio — 3 sites / month", price: "49", priceCurrency: "USD" },
              { "@type": "Offer", name: "Pro — 10 sites / month", price: "99", priceCurrency: "USD" },
            ],
          }),
        }}
      />

      {/* ---------- hero ---------- */}
      <section className="hero">
        <div className="container">
          <div className="eyebrow">Satellite monitoring for construction lenders</div>
          <h1>Know the moment a financed site goes quiet.</h1>
          <p className="lead">
            The money&rsquo;s already out the door. Then the site slows down — and between inspections, you&rsquo;re the
            last to know. Ground Stasis watches your projects by satellite and flags unusual drops in observable
            activity, so a stalling build is a Tuesday email, not a surprise at the next draw.
          </p>
          <div className="hero-actions">
            <CtaButton href="/#pricing" event="cta_click" params={{ location: "hero" }}>
              Check a site for $9
            </CtaButton>
            <CtaButton href="/demo" event="cta_click" params={{ location: "hero_secondary" }} variant="secondary">
              See a worked example
            </CtaButton>
          </div>
          <div className="assurance">
            <span><span className="ok">✓</span> $9 to start — one-time, not a subscription</span>
            <span><span className="ok">✓</span> No account needed to see a result</span>
            <span><span className="ok">✓</span> Self-serve. No demos, no sales calls</span>
          </div>
          <div className="trust-strip">
            <span>◰ Built on Copernicus Sentinel-2 — Europe&rsquo;s public Earth-observation program</span>
            <span>◆ Independent monitoring signal</span>
            <span>⚑ Evidence-led, with explicit limits</span>
          </div>
        </div>
      </section>

      {/* ---------- honest metric band ---------- */}
      <section className="metricband">
        <div className="container">
          <div className="metric-row">
            {[
              ["~5 days", "typical Sentinel-2 revisit"],
              ["10 m", "imagery resolution class"],
              ["$9", "to see your first site"],
              ["0", "sales calls, ever"],
            ].map(([n, l]) => (
              <div className="metric" key={l}>
                <div className="metric-n">{n}</div>
                <div className="metric-l">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- the problem ---------- */}
      <section className="section">
        <div className="container">
          <div className="kicker">The blind spot</div>
          <h2>Borrower reporting is not evidence. And it arrives late.</h2>
          <p className="body" style={{ marginTop: 14 }}>
            You can have draw requests, inspection reports, and a confident phone call from the borrower — and still
            discover weeks later that the project stopped moving after the money was advanced. Inspections are periodic;
            risk isn&rsquo;t. The stretch between site visits is where a quiet project quietly becomes a problem loan.
          </p>
          <p className="body" style={{ marginTop: 14 }}>
            Every week a stalled build goes unnoticed is interest accruing on collateral that isn&rsquo;t getting built.
            The earlier you see the slowdown, the more options you still have.
          </p>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="section alt">
        <div className="container">
          <div className="kicker">How it works</div>
          <h2>A single, narrow job: tell you when a site has gone unusually quiet.</h2>
          <div className="grid grid-3">
            {[
              ["1", "Define your site", "Enter an address or drop a pin — we turn it into the satellite area automatically. Add loan details if you like."],
              ["2", "We watch what the satellites see", "We collect available Copernicus Sentinel-2 observations over your site and filter out cloud-contaminated ones."],
              ["3", "We learn the site's normal", "We build a site-specific baseline of typical change, so the signal is measured against that site — not a generic rule."],
              ["4", "You get an alert when it goes quiet", "If observed change falls well below the site's baseline — with enough clean data to be confident — we email you."],
              ["5", "You review the evidence", "Open the site to see the observation timeline, change metrics, data quality, and a plain-language explanation."],
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

      {/* ---------- what you receive ---------- */}
      <section className="section">
        <div className="container">
          <div className="kicker">What you receive</div>
          <h2>Status first. Then why. Then the evidence.</h2>
          <div className="grid grid-4">
            {[
              ["Site activity status", "Active, Watch, Review, Stasis, or Data gap — the answer at a glance."],
              ["Stasis score", "A 0–100 monitoring score showing how strongly recent observations resemble an unusually inactive period."],
              ["Observation history", "A chronological record of every usable observation and its quality."],
              ["Plain-language explanation", "Why the status is what it is — written for a lender, not a GIS analyst."],
              ["Change metrics", "Site-level change, plus NDVI / NDBI / BSI deltas for the technically curious."],
              ["Email alerts", "Stasis detected, activity resumed, and data-gap notices — straight to your inbox."],
              ["Confidence rating", "Every signal carries High / Medium / Low confidence based on data quality."],
              ["Auditable trail", "A reproducible record behind every status, versioned so old scores stay reproducible."],
            ].map(([h, p]) => (
              <div className="card" key={h}>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Construction Draw Intelligence band ---------- */}
      <section className="section cdi-band">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: "center", gap: 36 }}>
            <div>
              <div className="kicker" style={{ color: "#fff" }}>New · premium module</div>
              <h2 style={{ color: "#fff", maxWidth: "20ch" }}>Two questions, one quiet workflow.</h2>
              <p style={{ color: "#cbd5e1", fontSize: 17, marginTop: 14, maxWidth: "52ch" }}>
                Monitoring answers <strong style={{ color: "#fff" }}>&ldquo;is it still moving?&rdquo;</strong>{" "}
                Construction Draw Intelligence adds the second question every draw review really asks:{" "}
                <strong style={{ color: "#fff" }}>&ldquo;does the physical evidence line up with what they&rsquo;re
                telling me?&rdquo;</strong> Record the reported milestone and draw, and we compare it against what the
                satellite actually observed — reported and observed kept clearly separate.
              </p>
              <div className="hero-actions" style={{ marginTop: 22 }}>
                <CtaButton href="/construction-draw-intelligence" event="draw_intelligence_offer_clicked" params={{ location: "home_band" }}>
                  Explore Draw Intelligence
                </CtaButton>
              </div>
              <p className="small" style={{ color: "#94a3b8", marginTop: 14 }}>
                $15/month per upgraded site, added to any plan. It never claims to verify work, value, or whether a draw
                should be released — it tells you where to look.
              </p>
            </div>
            <div className="cdi-compare">
              <div className="cdi-q">
                <div className="cdi-q-tag">Base monitoring</div>
                <div className="cdi-q-text">Is the site still moving?</div>
              </div>
              <div className="cdi-plus">+</div>
              <div className="cdi-q cdi-q-accent">
                <div className="cdi-q-tag">Draw Intelligence</div>
                <div className="cdi-q-text">Does the evidence match the reported milestone?</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- built for ---------- */}
      <section className="section">
        <div className="container">
          <div className="kicker">Built for</div>
          <h2>Small and private construction lenders.</h2>
          <p className="body" style={{ marginTop: 12 }}>
            For capital providers with a handful to a few dozen construction loans — not enterprise asset managers who
            need a full construction-intelligence platform. If you&rsquo;ve ever found out about a stall at the next
            draw, this is for you.
          </p>
          <div className="grid grid-3">
            {[
              "Private & hard-money lenders",
              "Bridge lenders",
              "Commercial real-estate lenders",
              "Small construction-loan portfolios",
              "Mortgage pros with construction loans",
              "Small debt funds & local lenders",
            ].map((x) => (
              <div className="card" key={x}>
                <h3 style={{ margin: 0 }}>{x}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- comparison ---------- */}
      <section className="section alt">
        <div className="container">
          <div className="kicker">Where it fits</div>
          <h2>Two different tools for two different jobs.</h2>
          <div className="grid grid-2">
            <div className="card">
              <h3>Enterprise construction-intelligence platforms</h3>
              <ul className="checklist" style={{ marginTop: 10 }}>
                <li>Broad portfolio monitoring &amp; dashboards</li>
                <li>Progress measurement &amp; milestone tracking</li>
                <li>Multiple &amp; commercial high-resolution imagery</li>
                <li>APIs and enterprise workflows</li>
              </ul>
              <p style={{ marginTop: 12 }}>Powerful, and priced for teams that need all of it — with the sales cycle to match.</p>
            </div>
            <div className="card" style={{ borderColor: "#fed7aa" }}>
              <h3>Ground Stasis</h3>
              <ul className="checklist" style={{ marginTop: 10 }}>
                <li>One narrow problem: has the site gone quiet?</li>
                <li>Simple onboarding, email-first alerts</li>
                <li>Free &amp; public Sentinel-2 data</li>
                <li>Low-cost, self-serve, minimal interface</li>
              </ul>
              <p style={{ marginTop: 12 }}>
                A simpler monitoring layer for lenders who don&rsquo;t need a full platform — live in minutes, for $9.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- pricing ---------- */}
      <PricingSection />

      {/* ---------- what it's NOT ---------- */}
      <section className="section">
        <div className="container">
          <div className="kicker">What Ground Stasis is not</div>
          <h2>We&rsquo;re careful about what satellite data can and cannot tell you.</h2>
          <p className="body" style={{ marginTop: 12 }}>
            This candor is the product. Ground Stasis is a monitoring signal. It does not replace physical inspections,
            construction professionals, appraisals, engineering reports, or underwriting judgment. It never claims a
            project has stopped, been abandoned, or involves fraud.
          </p>
          <ul className="notlist">
            <li>It does not prove construction has stopped — only that observed change looks unusually low.</li>
            <li>It does not measure concrete, framing, or roofing directly. Spectral indices are indirect signals.</li>
            <li>It does not make legal, underwriting, or loan-performance conclusions.</li>
            <li>It does not treat a cloudy or missing image as inactivity.</li>
          </ul>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="section alt">
        <div className="container">
          <div className="kicker">FAQ</div>
          <h2>Straight answers.</h2>
          <div className="grid grid-2">
            {FAQ.map((f) => (
              <div className="card" key={f.q}>
                <h3>{f.q}</h3>
                <p style={{ marginTop: 8 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="section finalcta" style={{ textAlign: "center" }}>
        <div className="container">
          <h2 style={{ margin: "0 auto", maxWidth: "22ch" }}>
            Spend $9 to find out what the satellite already saw.
          </h2>
          <p className="body" style={{ margin: "14px auto 0", maxWidth: "52ch", textAlign: "center" }}>
            One site, one payment, about two minutes. If a project you&rsquo;ve financed has gone quiet, you&rsquo;ll
            want to know today — not at the next draw.
          </p>
          <div className="hero-actions" style={{ justifyContent: "center", marginTop: 24 }}>
            <CtaButton href="/#pricing" event="cta_click" params={{ location: "footer_cta" }}>
              Check a site for $9
            </CtaButton>
            <CtaButton href="/demo" event="cta_click" params={{ location: "footer_cta_secondary" }} variant="secondary">
              See a worked example
            </CtaButton>
          </div>
        </div>
      </section>
    </>
  );
}
