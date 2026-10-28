import type { SiteStatus } from "./analysis/types";

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatPercent(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)}%`;
}

export function formatCurrency(v?: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export const STATUS_LABEL: Record<SiteStatus, string> = {
  ACTIVE: "Active",
  WATCH: "Watch",
  REVIEW: "Review",
  STASIS: "Stasis",
  DATA_GAP: "Data gap",
};

export const STATUS_COLOR: Record<SiteStatus, string> = {
  ACTIVE: "#00BFA5",
  WATCH: "#F59E0B",
  REVIEW: "#FB8C00",
  STASIS: "#FF6B00",
  DATA_GAP: "#64748B",
};

export const CONFIDENCE_LABEL: Record<string, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};
