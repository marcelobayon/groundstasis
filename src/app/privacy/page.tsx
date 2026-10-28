import type { Metadata } from "next";
import { SITE } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Ground Stasis handles your property, loan, and account information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <section className="section">
      <div className="container prose">
        <div className="eyebrow">Legal</div>
        <h1 style={{ fontSize: 34, marginTop: 10 }}>Privacy Policy</h1>
        <p className="muted small">Last updated: October 1, 2026</p>

        <p>
          {SITE.name} is a satellite-monitoring service for construction lenders. We treat the property and loan
          information you provide as sensitive business data and design the product to minimize what we collect and
          expose.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Account information: your email address.</li>
          <li>Site information you enter: project name, address or coordinates, site boundary, and optional loan amount, loan number, and expected dates.</li>
          <li>Derived monitoring data: satellite-observation metadata and the metrics and scores we compute for your sites.</li>
          <li>Basic product analytics (see below).</li>
        </ul>

        <h2>How we use it</h2>
        <p>
          We use your information solely to provide the monitoring service: to retrieve and analyze satellite
          observations over your sites, to compute status and alerts, and to notify you. We do not sell your data.
        </p>

        <h2>What we do not expose</h2>
        <ul>
          <li>We do not place loan amounts, loan numbers, email addresses, site coordinates, or private project names in public URLs.</li>
          <li>Private site data is not made available to search engines; monitoring pages are served with no-index directives.</li>
          <li>Access to a site requires an authorized, expiring link or session.</li>
        </ul>

        <h2>Satellite imagery</h2>
        <p>
          Monitoring is based on free and public Copernicus Sentinel-2 data. We store derived metrics and observation
          metadata rather than large raster archives.
        </p>

        <h2>Analytics</h2>
        <p>
          We use Google Analytics to understand product usage (page views and key actions). We do not send sensitive
          business information such as loan amounts, coordinates, or project names into analytics events.
        </p>

        <h2>Data retention</h2>
        <p>
          We retain your site history so your monitoring remains meaningful over time. If your subscription lapses, a
          site is paused rather than deleted, and historical observations are retained unless you ask us to remove them.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about privacy? Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
        </p>

        <p className="small muted" style={{ marginTop: 24 }}>
          This policy is a starting template for the MVP and should be reviewed by counsel before production use.
        </p>
      </div>
    </section>
  );
}
