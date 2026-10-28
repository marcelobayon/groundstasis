import type { Metadata } from "next";
import Link from "next/link";
import { getSiteRepository } from "@/lib/db/repository";
import { getSatelliteProvider } from "@/lib/satellite";
import { CheckFlow } from "@/components/check/CheckFlow";
import type { CheckResultDTO, CheckStatusResponse } from "@/lib/check/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your site check",
  robots: { index: false, follow: false },
};

function dtoFromResultJson(resultJson: unknown): CheckResultDTO | undefined {
  if (resultJson && typeof resultJson === "object" && "dto" in (resultJson as Record<string, unknown>)) {
    return (resultJson as { dto: CheckResultDTO }).dto;
  }
  return undefined;
}

export default async function CheckPage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const repo = getSiteRepository();

  let initial: CheckStatusResponse = { found: false, paid: false, analyzed: false };

  if (repo) {
    const row = await repo.getSiteCheckByToken(token);
    if (row) {
      const analyzed = Boolean(row.analyzedAt);
      initial = {
        found: true,
        paid: row.paid,
        analyzed,
        result: analyzed ? dtoFromResultJson(row.resultJson) : undefined,
        site: { siteName: row.siteName, address: row.address, areaAcres: row.areaAcres },
        liveUnavailable: getSatelliteProvider().isDemo,
      };
    }
  }

  return (
    <section className="section">
      <style>{`@keyframes gs-spin{to{transform:rotate(360deg)}}`}</style>
      <div className="container" style={{ maxWidth: 760 }}>
        {repo ? (
          <CheckFlow token={token} initial={initial} />
        ) : (
          <>
            <div className="eyebrow" style={{ color: "var(--action)" }}>Unavailable</div>
            <h1 style={{ fontSize: 30, margin: "10px 0 12px" }}>Checks aren&rsquo;t available here yet</h1>
            <p className="muted">
              The single-site check needs the database configured in this environment. If you just paid, contact{" "}
              <a href="mailto:hello@groundstasis.com">hello@groundstasis.com</a> and we&rsquo;ll run it for you.
            </p>
            <div style={{ marginTop: 18 }}>
              <Link className="btn btn-secondary" href="/">Back home</Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
