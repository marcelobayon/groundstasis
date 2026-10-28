import type { Observation, ObservationChange } from "./types";

// Temporal change between usable observations. This is the heart of the product:
// a construction project generally produces observable surface change over time,
// and stasis is an unusual, persistent *reduction* in that change.

/** Whole/fractional days between two ISO dates (absolute, never negative). */
export function daysBetween(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}

/**
 * Normalized site-change metric between two observations, as a percent:
 *
 *   siteChangePercent = ((|dNDVI| + |dNDBI| + |dBSI|) / 3) * 100
 *
 * The three indices respond to complementary surface changes (vegetation loss,
 * built-up increase, bare-soil exposure). Averaging their absolute deltas gives
 * a direction-agnostic "how much did the surface move" signal comparable across
 * observations of the same site.
 *
 * This is a HEURISTIC, not a physical measurement.
 */
export function siteChangePercent(delNdvi: number, delNdbi: number, delBsi: number): number {
  return ((Math.abs(delNdvi) + Math.abs(delNdbi) + Math.abs(delBsi)) / 3) * 100;
}

export function changeBetween(from: Observation, to: Observation): ObservationChange {
  const dN = to.ndvi.mean - from.ndvi.mean;
  const dB = to.ndbi.mean - from.ndbi.mean;
  const dS = to.bsi.mean - from.bsi.mean;
  const days = daysBetween(from.date, to.date);
  const change = siteChangePercent(dN, dB, dS);
  return {
    fromObservationId: from.observationId,
    toObservationId: to.observationId,
    fromDate: from.date,
    toDate: to.date,
    daysBetween: days,
    deltaNdvi: dN,
    deltaNdbi: dB,
    deltaBsi: dS,
    siteChangePercent: change,
    changeVelocity: days > 0 ? change / days : 0,
  };
}

/** Ordered change intervals from a chronological observation list. */
export function changeSeries(observations: Observation[]): ObservationChange[] {
  const out: ObservationChange[] = [];
  for (let i = 1; i < observations.length; i++) {
    out.push(changeBetween(observations[i - 1], observations[i]));
  }
  return out;
}
