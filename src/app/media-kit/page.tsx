import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE, BRAND } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Media Kit & Press",
  description:
    "Ground Stasis media kit: logos, brand assets, company facts, boilerplate, and press contact. Satellite monitoring for construction lenders.",
  alternates: { canonical: "/media-kit" },
};

const LOGOS: [string, string][] = [
  ["Logo — light background (SVG)", "/brand/gs-logo-horizontal-light-bg.svg"],
  ["Logo — light background (PNG)", "/brand/gs-logo-horizontal-light-bg.png"],
  ["Logo — dark background (SVG)", "/brand/gs-logo-horizontal-dark-bg.svg"],
  ["Logo — dark background (PNG)", "/brand/gs-logo-horizontal-dark-bg.png"],
  ["Mark only — light bg (SVG)", "/brand/gs-mark-light-bg.svg"],
  ["Mark only — dark bg (SVG)", "/brand/gs-mark-dark-bg.svg"],
  ["App icon / avatar (PNG 512)", "/brand/gs-icon-navy-512.png"],
  ["Share card (1200×630 PNG)", "/brand/og-image-1200x630.png"],
  ["LinkedIn banner (PNG)", "/brand/linkedin-banner-1128x191.png"],
];

const COLORS: [string, string][] = [
  ["Navy", BRAND.primary],
  ["Orange (accent)", BRAND.action],
  ["Slate", BRAND.secondary],
  ["Teal (status: active)", BRAND.success],
];

export default function Page() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 900 }}>
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Media kit", href: "/media-kit" }]} />
        <div className="eyebrow">Media kit &amp; press</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Ground Stasis media kit</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 16, maxWidth: "60ch" }}>
          Everything a journalist, partner, or directory needs to represent Ground Stasis accurately — logos, brand
          assets, company facts, and approved boilerplate. Use the assets as-is; please don&rsquo;t recolor or
          redraw the logo.
        </p>

        {/* Logo preview */}
        <div
          className="card"
          style={{ background: BRAND.primary, display: "flex", justifyContent: "center", padding: "36px 20px", marginBottom: 10 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/gs-logo-horizontal-dark-bg.svg" alt="Ground Stasis logo" style={{ height: 44 }} />
        </div>

        {/* Company facts */}
        <h2 style={{ fontSize: 24, marginTop: 28 }}>Company facts</h2>
        <table className="kv" style={{ marginTop: 10 }}>
          <tbody>
            <tr><td>Company</td><td>Ground Stasis</td></tr>
            <tr><td>What it is</td><td>Satellite monitoring for construction lenders — an independent signal for when a financed site goes quiet</td></tr>
            <tr><td>Founder</td><td>Marcelo Bayon</td></tr>
            <tr><td>Founded</td><td>2026</td></tr>
            <tr><td>Headquarters</td><td>Salt Lake City, Utah, USA</td></tr>
            <tr><td>Website</td><td><a href={SITE.url}>{SITE.domain}</a></td></tr>
            <tr><td>Category</td><td>Construction fintech / proptech · construction loan monitoring</td></tr>
            <tr><td>Pricing</td><td>$9 one-time site check; monitoring from $19/mo</td></tr>
            <tr><td>Press contact</td><td><a href="mailto:admin@groundstasis.com">admin@groundstasis.com</a></td></tr>
          </tbody>
        </table>

        {/* Boilerplate */}
        <h2 style={{ fontSize: 24, marginTop: 28 }}>Boilerplate</h2>
        <p style={{ color: "#334155" }}>
          <strong>One line:</strong> Ground Stasis uses satellite imagery to tell construction lenders whether a
          financed project is actually moving — flagging stalled sites remotely, without a truck roll.
        </p>
        <p style={{ color: "#334155" }}>
          <strong>Short:</strong> Ground Stasis is satellite-based monitoring software for construction lenders.
          Instead of relying on costly physical draw inspections, it analyzes recent satellite imagery of each
          financed site to detect stalled construction and alert lenders to risk — continuously, remotely, and at a
          fraction of inspection cost. Founded by Marcelo Bayon and based in Salt Lake City.
        </p>

        {/* Logos & assets */}
        <h2 style={{ fontSize: 24, marginTop: 28 }}>Logos &amp; assets</h2>
        <ul className="checklist" style={{ marginTop: 10 }}>
          {LOGOS.map(([label, href]) => (
            <li key={href}>
              <a href={href} download>{label}</a>
            </li>
          ))}
        </ul>

        {/* Colors */}
        <h2 style={{ fontSize: 24, marginTop: 28 }}>Brand colors</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
          {COLORS.map(([name, hex]) => (
            <div key={hex} style={{ width: 150 }}>
              <div style={{ height: 56, borderRadius: 8, background: hex, border: "1px solid #e2e8f0" }} />
              <div className="small" style={{ marginTop: 6 }}>
                <strong>{name}</strong>
                <br />
                <code>{hex}</code>
              </div>
            </div>
          ))}
        </div>

        {/* Intro video */}
        <h2 style={{ fontSize: 24, marginTop: 28 }}>Intro video</h2>
        <p className="muted" style={{ marginBottom: 10 }}>An 8-second animated logo intro.</p>
        <video controls preload="metadata" style={{ width: "100%", maxWidth: 560, borderRadius: 10, background: "#000" }}>
          <source src="/brand/groundstasis-intro.mp4" type="video/mp4" />
        </video>

        {/* What it is / isn't */}
        <h2 style={{ fontSize: 24, marginTop: 28 }}>How to describe Ground Stasis accurately</h2>
        <p style={{ color: "#334155" }}>
          Ground Stasis is an <strong>independent monitoring signal</strong>, not proof. Please describe it as flagging
          when observed site activity goes unusually quiet — not as detecting that construction has &ldquo;stopped,&rdquo;
          and not as verifying work quality, completed value, or draw eligibility. Satellite observations are limited by
          imagery resolution, revisit frequency, and cloud cover; a missing image is a data gap, never evidence of
          inactivity.
        </p>

        {/* Press */}
        <h2 style={{ fontSize: 24, marginTop: 28 }}>Press &amp; media inquiries</h2>
        <p style={{ color: "#334155" }}>
          For interviews, quotes, or additional materials, contact{" "}
          <a href="mailto:admin@groundstasis.com">admin@groundstasis.com</a>. We don&rsquo;t have press releases yet —
          as Ground Stasis publishes announcements, they&rsquo;ll live here.
        </p>

        <p className="small muted" style={{ marginTop: 24 }}>
          More about the product: <Link href="/construction-loan-monitoring">construction loan monitoring</Link> ·{" "}
          <Link href="/satellite-construction-monitoring">how satellite monitoring works</Link> ·{" "}
          <Link href="/methodology">methodology</Link>.
        </p>
      </div>
    </section>
  );
}
