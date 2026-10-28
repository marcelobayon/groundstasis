import type { SiteStatus } from "@/lib/analysis/types";
import type { ProviderSite } from "@/lib/satellite/types";
import { DemoProvider } from "@/lib/satellite/demo-provider";
import { DEMO_SITE } from "@/data/demo-site";
import { analyzeSite, type AnalyzeSiteResult } from "./analyze-site";

export function demoProviderSite(): ProviderSite {
  return { id: DEMO_SITE.id, name: DEMO_SITE.name, geometry: DEMO_SITE.geometry };
}

/**
 * Run the full analysis cycle over the DEMO site, always using the DemoProvider
 * (so it never touches a live API even if one is configured). The previous
 * status is seeded as REVIEW so the run demonstrates a STASIS_DETECTED alert.
 */
export async function runDemoAnalysis(
  opts: { previousStatus?: SiteStatus | null; recipientEmail?: string } = {}
): Promise<AnalyzeSiteResult> {
  return analyzeSite({
    provider: new DemoProvider(),
    site: demoProviderSite(),
    siteName: DEMO_SITE.name,
    loanNumber: DEMO_SITE.loanNumber,
    recipientEmail: opts.recipientEmail,
    previousStatus: opts.previousStatus ?? "REVIEW",
    now: new Date(DEMO_SITE.asOf),
  });
}
