import type { Metadata } from "next";
import { SITE } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing use of Ground Stasis.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <section className="section">
      <div className="container prose">
        <div className="eyebrow">Legal</div>
        <h1 style={{ fontSize: 34, marginTop: 10 }}>Terms of Service</h1>
        <p className="muted small">Last updated: October 1, 2026</p>

        <h2>The service</h2>
        <p>
          {SITE.name} provides an independent satellite-monitoring signal that flags construction sites showing an
          unusual decline in observable activity. The service is offered on a subscription basis.
        </p>

        <h2>Not a substitute for inspection or professional judgment</h2>
        <p>
          You understand and agree that {SITE.name} is a monitoring signal only. It does <strong>not</strong> replace
          physical inspections, construction professionals, appraisals, engineering reports, or underwriting judgment,
          and it does not determine whether construction has stopped, been abandoned, or involves any wrongdoing.
          Satellite observations are intermittent and may be unavailable due to weather or acquisition conditions. You
          are responsible for how you use the signal in your own decisions.
        </p>

        <h2>No warranty on signals or availability</h2>
        <p>
          Alerts and scores are provided &ldquo;as is.&rdquo; We do not warrant that imagery will be available on any
          schedule, that every stasis event will be detected, or that every alert reflects an actual change on the
          ground. Imagery availability varies with satellite acquisition and weather.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Monitor only sites you have a legitimate business interest in.</li>
          <li>Do not attempt to access sites or data belonging to other customers.</li>
          <li>Do not resell or redistribute the service without a written agreement.</li>
        </ul>

        <h2>Billing</h2>
        <p>
          Subscriptions are billed per monitored site. Monitoring begins only after payment is confirmed. You may cancel
          at any time; monitoring continues through the end of the paid period, after which the site is paused.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, {SITE.name} is not liable for any indirect, incidental, or
          consequential damages, or for decisions made in reliance on the service. The service is a supplementary signal,
          not a guarantee.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
        </p>

        <p className="small muted" style={{ marginTop: 24 }}>
          These terms are a starting template for the MVP and should be reviewed by counsel before production use.
        </p>
      </div>
    </section>
  );
}
