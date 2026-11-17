// Ground-truth labels for Phase 2 validation. Labels are INDEPENDENTLY sourced
// (permit records, GC-confirmed timelines, inspection reports) and supplied by a
// human — never inferred by the engine or invented here. parseLabels enforces
// that discipline: every label must name its provenance, or it is rejected.

export type GroundTruth = "ACTIVE" | "STALLED";

export interface SiteLabel {
  /** The Site.id in the database whose stored observations will be evaluated. */
  siteId: string;
  /** ISO dates bounding the labeled period. Evaluation runs "as of" periodEnd. */
  periodStart: string;
  periodEnd: string;
  /** The independently established reality for this site over the period. */
  groundTruth: GroundTruth;
  /** REQUIRED provenance, e.g. "Salt Lake County permit #B-2026-1183, final inspection 2026-08-04". */
  source: string;
  /** Optional free-text note. */
  note?: string;
}

function isIso(s: unknown): s is string {
  return typeof s === "string" && !Number.isNaN(Date.parse(s));
}

/**
 * Parse and validate a labels array (e.g. from labels.json). Throws on anything
 * malformed or unsourced — a label with no `source` is treated as fabricated and
 * rejected. Entries flagged `"__example__": true` are skipped (so the shipped
 * example file never contributes fake ground truth to a run).
 */
export function parseLabels(raw: unknown): SiteLabel[] {
  if (!Array.isArray(raw)) throw new Error("labels must be a JSON array");
  const out: SiteLabel[] = [];
  raw.forEach((item, i) => {
    if (item && typeof item === "object" && (item as Record<string, unknown>).__example__ === true) {
      return; // illustrative schema row, not real data
    }
    const o = item as Record<string, unknown>;
    const where = `labels[${i}]`;
    if (typeof o.siteId !== "string" || !o.siteId.trim()) throw new Error(`${where}: siteId is required`);
    if (!isIso(o.periodStart)) throw new Error(`${where}: periodStart must be an ISO date`);
    if (!isIso(o.periodEnd)) throw new Error(`${where}: periodEnd must be an ISO date`);
    if (o.groundTruth !== "ACTIVE" && o.groundTruth !== "STALLED") {
      throw new Error(`${where}: groundTruth must be "ACTIVE" or "STALLED"`);
    }
    if (typeof o.source !== "string" || !o.source.trim()) {
      throw new Error(`${where}: source (provenance) is required — unsourced labels are not accepted`);
    }
    if (Date.parse(o.periodEnd as string) < Date.parse(o.periodStart as string)) {
      throw new Error(`${where}: periodEnd is before periodStart`);
    }
    out.push({
      siteId: o.siteId,
      periodStart: o.periodStart as string,
      periodEnd: o.periodEnd as string,
      groundTruth: o.groundTruth,
      source: o.source,
      note: typeof o.note === "string" ? o.note : undefined,
    });
  });
  return out;
}
