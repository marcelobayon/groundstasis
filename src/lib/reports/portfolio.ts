// Portfolio rollup — the reusable aggregation primitive.
//
// Turns a user's list of sites (each with its latest status) into a summary:
// how many sites sit in each status, and which ones are "exceptions" a lender
// should actually look at this week. This is intentionally PURE and
// dependency-free so it can power the weekly email digest, the account
// dashboard header, a future Salesforce/Teams widget, and the API — one
// definition of "what does my portfolio look like right now," reused everywhere.
//
// It never concludes anything beyond the stored status. A DATA_GAP is a gap in
// evidence, not inactivity (see the product's status integrity rule).

import type { SiteStatus } from "@/lib/analysis/types";

/** The shape repository.getSitesForUser() already returns. */
export interface PortfolioSite {
  id: string;
  name: string;
  address: string | null;
  status: SiteStatus;
  stasisScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  lastEvaluatedAt: Date | null;
}

export interface StatusMeta {
  /** Human label (matches the account dashboard + brand guide). */
  label: string;
  /** Brand status color (brand-guide §4.2). */
  color: string;
  /** Plain-text indicator for text emails / logs. */
  dot: string;
}

// Canonical status presentation. Single source of truth for labels + colors so
// the email, the dashboard, and any integration stay consistent. (The account
// PortfolioView currently hardcodes the same values and can be pointed here.)
export const STATUS_META: Record<SiteStatus, StatusMeta> = {
  ACTIVE: { label: "Active", color: "#00BFA5", dot: "[active]" },
  WATCH: { label: "Watch", color: "#F59E0B", dot: "[watch]" },
  REVIEW: { label: "Review", color: "#FB8C00", dot: "[review]" },
  STASIS: { label: "Stasis", color: "#EF4444", dot: "[stasis]" },
  DATA_GAP: { label: "Data gap", color: "#64748B", dot: "[data gap]" },
};

/** Display order: most-reassuring to most-attention-worthy. */
export const STATUS_ORDER: readonly SiteStatus[] = [
  "ACTIVE",
  "WATCH",
  "REVIEW",
  "STASIS",
  "DATA_GAP",
] as const;

/** Statuses worth a closer look — everything that isn't plainly active/easing. */
export function isException(status: SiteStatus): boolean {
  return status === "REVIEW" || status === "STASIS" || status === "DATA_GAP";
}

export interface PortfolioSummary {
  /** Total monitored sites. */
  total: number;
  /** Count of sites in each status (always all five keys present). */
  counts: Record<SiteStatus, number>;
  /** Exception sites, most-severe first — the "view exceptions" list. */
  exceptions: PortfolioSite[];
  /** How many sites are exceptions (convenience; == exceptions.length). */
  exceptionCount: number;
  /** When this summary was computed. */
  generatedAt: Date;
}

function severityRank(status: SiteStatus): number {
  switch (status) {
    case "STASIS":
      return 3;
    case "REVIEW":
      return 2;
    case "DATA_GAP":
      return 1;
    default:
      return 0;
  }
}

/**
 * Summarize a portfolio. Deterministic; does not mutate the input. Exceptions
 * are sorted most-severe first, then by stasis score descending, so the most
 * attention-worthy site leads.
 */
export function summarizePortfolio(
  sites: PortfolioSite[],
  now: Date = new Date(),
): PortfolioSummary {
  const counts: Record<SiteStatus, number> = {
    ACTIVE: 0,
    WATCH: 0,
    REVIEW: 0,
    STASIS: 0,
    DATA_GAP: 0,
  };
  for (const s of sites) {
    counts[s.status] = (counts[s.status] ?? 0) + 1;
  }
  const exceptions = sites
    .filter((s) => isException(s.status))
    .sort(
      (a, b) =>
        severityRank(b.status) - severityRank(a.status) ||
        b.stasisScore - a.stasisScore,
    );
  return {
    total: sites.length,
    counts,
    exceptions,
    exceptionCount: exceptions.length,
    generatedAt: now,
  };
}
