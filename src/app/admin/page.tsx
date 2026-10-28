import type { Metadata } from "next";
import { isAdmin, capabilities } from "@/lib/env";
import { evaluateSite, STASIS_CONFIG } from "@/lib/analysis";
import { DEMO_SITE } from "@/data/demo-site";
import { AdminLogin, RunAnalysisButton } from "@/components/admin-run";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage({ searchParams }: { searchParams: { secret?: string } }) {
  const secret = searchParams?.secret ?? "";

  if (!isAdmin(secret)) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 520 }}>
          <div className="eyebrow">Internal</div>
          <h1 style={{ fontSize: 28, margin: "10px 0 8px" }}>Admin &amp; debug</h1>
          <p className="muted" style={{ marginBottom: 18 }}>
            Protected by <code>ADMIN_SECRET</code>. {process.env.ADMIN_SECRET ? "Enter it to continue." : "ADMIN_SECRET is not set, so admin is disabled in this environment."}
          </p>
          {process.env.ADMIN_SECRET ? <AdminLogin /> : null}
        </div>
      </section>
    );
  }

  const ev = evaluateSite(DEMO_SITE.observations, STASIS_CONFIG, new Date(DEMO_SITE.asOf));
  const caps = capabilities();

  return (
    <section className="section">
      <div className="container">
        <div className="eyebrow">Internal</div>
        <h1 style={{ fontSize: 28, margin: "10px 0 18px" }}>Admin &amp; debug</h1>

        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Environment capabilities</h3>
            <table className="kv">
              <tbody>
                <tr><td>Database</td><td>{caps.database ? "configured" : "demo (none)"}</td></tr>
                <tr><td>Satellite provider</td><td>{caps.satelliteProvider}</td></tr>
                <tr><td>Satellite configured</td><td>{caps.satelliteConfigured ? "yes" : "no"}</td></tr>
                <tr><td>Stripe</td><td>{caps.stripe ? "configured" : "not set"}</td></tr>
                <tr><td>Email provider</td><td>{caps.emailProvider}</td></tr>
                <tr><td>Magic link</td><td>{caps.magicLink ? "configured" : "not set"}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Demo site — latest evaluation</h3>
            <table className="kv">
              <tbody>
                <tr><td>Site</td><td>{DEMO_SITE.name}</td></tr>
                <tr><td>Status</td><td>{ev.status}</td></tr>
                <tr><td>Stasis score</td><td>{ev.stasis.score}/100</td></tr>
                <tr><td>Confidence</td><td>{ev.confidence.level}</td></tr>
                <tr><td>Usable observations</td><td>{ev.usableObservationCount}</td></tr>
                <tr><td>Latest observation</td><td>{formatDate(ev.latestObservation?.date)}</td></tr>
                <tr><td>Analysis version</td><td>{ev.analysisVersion}</td></tr>
                <tr><td>Thresholds version</td><td>{ev.thresholdsVersion}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 6 }}>Run analysis (test)</h3>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Runs the full analysis cycle over the demo site (fetch → filter → score → status → alert decision → email via
            the console provider). Idempotent.
          </p>
          <RunAnalysisButton secret={secret} />
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 10 }}>Active thresholds (STASIS_CONFIG)</h3>
          <pre style={{ background: "#0a192f", color: "#e2e8f0", padding: 14, borderRadius: 8, fontSize: 12.5, overflowX: "auto" }}>
            {JSON.stringify(STASIS_CONFIG, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}
