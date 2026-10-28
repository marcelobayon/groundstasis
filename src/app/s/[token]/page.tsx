import type { Metadata } from "next";
import Link from "next/link";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link";
import { getMagicLinkSecrets } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Secure link",
  robots: { index: false, follow: false },
};

export default function MagicLinkPage({ params }: { params: { token: string } }) {
  const secrets = getMagicLinkSecrets();
  const result = secrets.length
    ? verifyMagicLinkToken(decodeURIComponent(params.token), secrets)
    : ({ valid: false, reason: "MAGIC_LINK_SECRET not configured in this environment" } as const);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        {result.valid ? (
          <>
            <div className="eyebrow" style={{ color: "var(--success)" }}>Verified</div>
            <h1 style={{ fontSize: 28, margin: "10px 0 8px" }}>You&rsquo;re signed in</h1>
            <p className="muted">
              This secure link is valid for site <code>{result.payload.sub}</code>
              {result.payload.scope ? ` (scope: ${result.payload.scope})` : ""}. In production this opens that
              site&rsquo;s dashboard. For the MVP, here&rsquo;s the worked demo:
            </p>
            <div style={{ marginTop: 18 }}>
              <Link className="btn btn-primary" href="/demo">
                Open the dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="eyebrow" style={{ color: "var(--action)" }}>Link problem</div>
            <h1 style={{ fontSize: 28, margin: "10px 0 8px" }}>This link can&rsquo;t be opened</h1>
            <p className="muted">
              {result.reason === "expired"
                ? "This link has expired. Magic links are short-lived for security — request a fresh one."
                : `We couldn't verify this link (${result.reason}).`}
            </p>
            <div style={{ marginTop: 18 }}>
              <Link className="btn btn-secondary" href="/">
                Back home
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
