// Pure math behind the free SEO calculators. Kept separate from the React UI so
// the money-math is unit-tested. These tools TEACH the problem (the cost of a
// delay, the size of a monitoring gap); they never claim to detect that a site
// has stalled — that is what the paid Ground Stasis check/subscription does.

export interface DelayCostInput {
  /** outstanding construction loan principal */
  loanBalance: number;
  /** annual interest rate as a percent, e.g. 11 for 11% */
  annualRatePct: number;
  /** other monthly carrying costs (taxes, insurance, etc.) — optional */
  monthlyCarry?: number;
  /** expected delay, in months */
  delayMonths: number;
}

export interface DelayCostResult {
  monthlyInterest: number;
  interestOverDelay: number;
  carryOverDelay: number;
  totalDelayCost: number;
}

export function delayCost(i: DelayCostInput): DelayCostResult {
  const balance = Math.max(0, i.loanBalance || 0);
  const months = Math.max(0, i.delayMonths || 0);
  const monthlyInterest = (balance * (Math.max(0, i.annualRatePct || 0) / 100)) / 12;
  const interestOverDelay = monthlyInterest * months;
  const carryOverDelay = Math.max(0, i.monthlyCarry ?? 0) * months;
  return {
    monthlyInterest,
    interestOverDelay,
    carryOverDelay,
    totalDelayCost: interestOverDelay + carryOverDelay,
  };
}

export type GapBand = "LOW" | "MODERATE" | "HIGH";

export interface GapInput {
  /** ISO date of the last site inspection / verified activity */
  lastInspectionISO: string;
  /** the inspection cadence you intend to keep, in days */
  cadenceDays: number;
  /** ISO "today" — injectable for tests */
  todayISO?: string;
}

export interface GapResult {
  daysSinceInspection: number;
  cadenceDays: number;
  /** days beyond the intended cadence with no independent confirmation */
  gapDays: number;
  band: GapBand;
}

export function daysBetweenDates(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function monitoringGap(i: GapInput): GapResult {
  const todayISO = i.todayISO ?? new Date().toISOString();
  const daysSince = daysBetweenDates(i.lastInspectionISO, todayISO);
  const cadence = Math.max(1, Math.floor(i.cadenceDays || 1));
  const gapDays = Math.max(0, daysSince - cadence);
  let band: GapBand = "LOW";
  if (gapDays > cadence) band = "HIGH";
  else if (gapDays > 0) band = "MODERATE";
  return { daysSinceInspection: daysSince, cadenceDays: cadence, gapDays, band };
}

// --- Construction cost escalation (Tier 1) ----------------------------------
// Projects a base construction cost forward at an annual escalation rate over a
// time period. Supports a clearly-labeled simple OR compound model. This is a
// generalized estimate from the user's own assumptions — NOT a contractor quote
// and NOT a guaranteed future cost. Negative/invalid inputs are clamped to a
// safe value here; the UI surfaces a visible validation error rather than
// relying on silent clamping.

export type EscalationMode = "compound" | "simple";
export type PeriodUnit = "months" | "years";

export interface EscalationInput {
  /** base construction cost in dollars (>= 0) */
  baseCost: number;
  /** annual escalation rate as a percent, e.g. 6 for 6%/yr (>= 0) */
  annualRatePct: number;
  /** length of the escalation period, in `periodUnit` */
  periodValue: number;
  periodUnit: PeriodUnit;
  /** "compound" (annual compounding, default UI choice) or "simple" */
  mode: EscalationMode;
}

export interface EscalationResult {
  /** period expressed in years (months / 12) */
  years: number;
  projectedCost: number;
  dollarIncrease: number;
  /** percent increase over base; 0 when base is 0 to avoid divide-by-zero */
  pctIncrease: number;
}

export function escalationCost(i: EscalationInput): EscalationResult {
  const base = Math.max(0, i.baseCost || 0);
  const rate = Math.max(0, i.annualRatePct || 0) / 100;
  const periodValue = Math.max(0, i.periodValue || 0);
  const years = i.periodUnit === "months" ? periodValue / 12 : periodValue;

  let projected: number;
  if (i.mode === "simple") {
    projected = base * (1 + rate * years);
  } else {
    projected = base * Math.pow(1 + rate, years);
  }
  // Overflow / non-finite guard: never surface Infinity or NaN.
  if (!Number.isFinite(projected)) projected = base;

  const dollarIncrease = projected - base;
  const pctIncrease = base > 0 ? (projected / base - 1) * 100 : 0;
  return { years, projectedCost: projected, dollarIncrease, pctIncrease };
}

export function formatCurrency(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
