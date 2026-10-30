import * as React from "react";
import Link from "next/link";
import { Logo } from "./brand";
import { CtaButton } from "./cta";
import { SITE } from "@/lib/config/site";

export function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" aria-label="Ground Stasis home" style={{ display: "inline-flex" }}>
          <Logo height={24} />
        </Link>
        <nav className="nav-links">
          <Link className="hide-sm" href="/demo">
            See how it works
          </Link>
          <Link className="hide-sm" href="/methodology">
            Methodology
          </Link>
          <Link className="hide-sm" href="/tools">
            Free tools
          </Link>
          <Link className="hide-sm" href="/#pricing">
            Pricing
          </Link>
          <Link className="hide-sm" href="/account">
            Sign in
          </Link>
          <CtaButton href="/#pricing" event="cta_click" params={{ location: "nav" }} size="sm">
            Check a site · $9
          </CtaButton>
        </nav>
      </div>
    </header>
  );
}

const colStyle: React.CSSProperties = { flexDirection: "column", gap: 10, alignItems: "flex-start" };
const headStyle: React.CSSProperties = {
  color: "#e2e8f0",
  fontSize: 12.5,
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-cols">
          <div>
            <Link href="/" aria-label="Ground Stasis home" style={{ display: "inline-flex" }}>
              <Logo height={22} mono />
            </Link>
            <p style={{ maxWidth: 300, marginTop: 12, fontSize: 14, color: "#94a3b8" }}>
              Satellite monitoring that tells construction lenders when a financed project appears to
              have gone quiet.
            </p>
          </div>

          <div className="footer-links" style={colStyle}>
            <strong style={headStyle}>Free tools</strong>
            <Link href="/construction-loan-monitoring">Construction loan monitoring</Link>
            <Link href="/construction-lender-stack">Construction lender stack</Link>
            <Link href="/construction-escalation-calculator">Escalation calculator</Link>
            <Link href="/construction-delay-cost-calculator">Delay cost calculator</Link>
            <Link href="/construction-monitoring-gap-calculator">Monitoring gap calculator</Link>
            <Link href="/construction-draw-inspection-form">Draw inspection form</Link>
            <Link href="/tools">All free tools</Link>
          </div>

          <div className="footer-links" style={colStyle}>
            <strong style={headStyle}>Product</strong>
            <Link href="/#pricing">Pricing · check a site $9</Link>
            <Link href="/construction-draw-intelligence">Draw Intelligence</Link>
            <Link href="/demo">Demo</Link>
            <Link href="/methodology">Methodology</Link>
            <Link href="/docs">API &amp; docs</Link>
            <Link href="/integrations/zapier">Integrations</Link>
          </div>

          <div className="footer-links" style={colStyle}>
            <strong style={headStyle}>Company</strong>
            <Link href="/">Home</Link>
            <Link href="/media-kit">Media kit</Link>
            <Link href="/account">Sign in</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
        <small>
          {SITE.name} is an independent monitoring signal, not a replacement for physical inspection,
          appraisal, engineering review, or underwriting judgment. Satellite observations are not
          continuous and cannot establish that construction has stopped, or why. Imagery availability
          varies with satellite acquisition and weather conditions.
          <br />© {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </small>
      </div>
    </footer>
  );
}
