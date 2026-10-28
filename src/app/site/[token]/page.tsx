import type { Metadata } from "next";
import Link from "next/link";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link";
import { getMagicLinkSecrets } from "@/lib/env";
import { getSiteRepository } from "@/lib/db/repository";
import { getSatelliteProvider } from "@/lib/satellite";
import { SiteWorkspace } from "@/components/cdi/SiteWorkspace";
import type { CdiFinding } from "@/lib/cdi/findings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Site workspace",
  robots: { index: false, follow: false },
};

function Invalid({ message }: { message: string }) {
  return (
    <>
      <div className="eyebrow" style={{ color: "var(--action)" }}>Link problem</div>
      <h1 style={{ fontSize: 28, margin: "10px 0 8px" }}>This workspace link can&rsquo;t be opened</h1>
      <p className="muted">{message}</p>
      <div style={{ marginTop: 18 }}>
        <Link className="btn btn-secondary" href="/">Back home</Link>
      </div>
    </>
  );
}

export default async function SiteWorkspacePage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const auth = verifyMagicLinkToken(token, getMagicLinkSecrets());
  const repo = getSiteRepository();

  let content: React.ReactNode;
  if (!repo) {
    content = <Invalid message="Workspaces aren't available in this environment yet (no database configured)." />;
  } else if (!auth.valid) {
    content = (
      <Invalid
        message={
          auth.reason === "expired"
            ? "This secure link has expired. Open the latest link from a Ground Stasis email, and we'll send a fresh one with your next finding."
            : `We couldn't verify this link (${auth.reason}).`
        }
      />
    );
  } else if (auth.payload.scope !== "site:workspace") {
    content = <Invalid message="This link isn't a Draw Intelligence workspace link." />;
  } else {
    const ws = await repo.getSiteWorkspace(auth.payload.sub);
    if (!ws) {
      content = <Invalid message="We couldn't find that site." />;
    } else {
      const mi = ws.milestone;
      const initialMilestone = {
        reportedStage: mi?.reportedStage ?? "UNKNOWN",
        expectedMilestone: mi?.expectedMilestone ?? "",
        targetDate: mi?.targetDate ? new Date(mi.targetDate).toISOString().slice(0, 10) : "",
        actualStageReported: mi?.actualStageReported ?? "",
        drawReference: mi?.drawReference ?? "",
        drawAmount: mi?.drawAmount != null ? String(mi.drawAmount) : "",
        note: mi?.note ?? "",
      };
      const finding = (mi?.lastFindingJson as CdiFinding | null) ?? null;
      content = (
        <SiteWorkspace
          token={params.token}
          site={ws.site}
          entitlement={ws.entitlement}
          initialMilestone={initialMilestone}
          initialFinding={finding}
          liveUnavailable={getSatelliteProvider().isDemo}
        />
      );
    }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>{content}</div>
    </section>
  );
}
