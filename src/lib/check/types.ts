import type { SiteStatus, ConfidenceLevel } from "@/lib/analysis/types";

// The render contract for a $9 single-site check result. Produced server-side
// from a SiteEvaluation, stored on the SiteCheck row, and read by the results
// page. Client-safe (types only).

export interface CheckObservationPoint {
  date: string;
  validPixelPercent: number;
  quality: "OK" | "LOW_QUALITY";
  ndviMean: number;
}

export interface CheckResultDTO {
  status: SiteStatus;
  score: number;
  confidence: ConfidenceLevel;
  explanation: string;
  reasons: string[];
  latestObservationDate: string | null;
  previousObservationDate: string | null;
  usableObservationCount: number;
  recentChangePercent: number;
  baselineChangePercent: number;
  lowChangeDurationDays: number;
  areaAcres: number | null;
  siteName: string | null;
  address: string | null;
  analyzedAtIso: string;
  isDemo: boolean;
  dataGap: boolean;
  suitability: "GOOD" | "LIMITED" | "INSUFFICIENT" | null;
  observations: CheckObservationPoint[];
}

export interface CheckStatusResponse {
  found: boolean;
  paid: boolean;
  analyzed: boolean;
  /** present once analyzed */
  result?: CheckResultDTO;
  /** the site the buyer already entered, if any (lets the form prefill) */
  site?: { siteName: string | null; address: string | null; areaAcres: number | null };
  /** true when live imagery isn't configured, so the form should warn */
  liveUnavailable?: boolean;
}
