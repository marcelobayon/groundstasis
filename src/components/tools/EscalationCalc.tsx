"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { escalationCost, formatCurrency, type EscalationMode, type PeriodUnit } from "@/lib/tools/calc";
import { trackToolStart, trackToolComplete, trackToolValidationError, type ToolMeta } from "@/lib/analytics";

const META: ToolMeta = {
  tool_name: "construction_escalation_calculator",
  tool_type: "calculator",
  content_tier: "tier_1",
};

const DEFAULTS = {
  base: "1000000",
  rate: "6",
  period: "24",
  unit: "months" as PeriodUnit,
  mode: "compound" as EscalationMode,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 15,
};

export function EscalationCalc() {
  const [base, setBase] = useState(DEFAULTS.base);
  const [rate, setRate] = useState(DEFAULTS.rate);
  const [period, setPeriod] = useState(DEFAULTS.period);
  const [unit, setUnit] = useState<PeriodUnit>(DEFAULTS.unit);
  const [mode, setMode] = useState<EscalationMode>(DEFAULTS.mode);

  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const erroredRef = useRef(false);

  function touch() {
    if (!startedRef.current) {
      startedRef.current = true;
      trackToolStart(META);
    }
  }

  const parsed = useMemo(() => {
    const b = Number(base);
    const r = Number(rate);
    const p = Number(period);
    const invalid: string[] = [];
    if (base.trim() === "" || !Number.isFinite(b) || b < 0) invalid.push("base cost");
    if (rate.trim() === "" || !Number.isFinite(r) || r < 0) invalid.push("escalation rate");
    if (period.trim() === "" || !Number.isFinite(p) || p < 0) invalid.push("time period");
    return { b, r, p, invalid };
  }, [base, rate, period]);

  const result = useMemo(() => {
    if (parsed.invalid.length) return null;
    return escalationCost({
      baseCost: parsed.b,
      annualRatePct: parsed.r,
      periodValue: parsed.p,
      periodUnit: unit,
      mode,
    });
  }, [parsed, unit, mode]);

  useEffect(() => {
    if (result && !completedRef.current) {
      completedRef.current = true;
      trackToolComplete(META);
    }
  }, [result]);

  useEffect(() => {
    const touched = base.trim() !== "" || rate.trim() !== "" || period.trim() !== "";
    if (parsed.invalid.length && touched) {
      if (!erroredRef.current) {
        erroredRef.current = true;
        trackToolValidationError(META.tool_name, "invalid_input");
      }
    } else {
      erroredRef.current = false;
    }
  }, [parsed.invalid.length, base, rate, period]);

  function reset() {
    setBase(DEFAULTS.base);
    setRate(DEFAULTS.rate);
    setPeriod(DEFAULTS.period);
    setUnit(DEFAULTS.unit);
    setMode(DEFAULTS.mode);
  }

  const periodLabel = unit === "months" ? "months" : "years";

  return (
    <div className="card">
      <div className="grid grid-2" style={{ gap: 14, marginTop: 0 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="esc-base">Base construction cost ($)</label>
          <input id="esc-base" inputMode="numeric" value={base} onChange={(e) => { touch(); setBase(e.target.value); }} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="esc-rate">Annual escalation rate (%)</label>
          <input id="esc-rate" inputMode="decimal" value={rate} onChange={(e) => { touch(); setRate(e.target.value); }} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="esc-period">Time period</label>
          <input id="esc-period" inputMode="decimal" value={period} onChange={(e) => { touch(); setPeriod(e.target.value); }} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="esc-unit">Period unit</label>
          <select id="esc-unit" style={selectStyle} value={unit} onChange={(e) => { touch(); setUnit(e.target.value as PeriodUnit); }}>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
      </div>

      <div className="field" style={{ marginTop: 14, marginBottom: 0, maxWidth: 380 }}>
        <label htmlFor="esc-mode">Escalation model</label>
        <select id="esc-mode" style={selectStyle} value={mode} onChange={(e) => { touch(); setMode(e.target.value as EscalationMode); }}>
          <option value="compound">Compound (annual compounding)</option>
          <option value="simple">Simple (flat rate × time)</option>
        </select>
      </div>

      <div aria-live="polite">
        {result ? (
          <>
            <div className="statline" style={{ marginTop: 20 }}>
              <div className="stat">
                <div className="label">Projected cost</div>
                <div className="value">{formatCurrency(result.projectedCost)}</div>
              </div>
              <div className="stat">
                <div className="label">Dollar increase</div>
                <div className="value">{formatCurrency(result.dollarIncrease)}</div>
              </div>
              <div className="stat" style={{ background: "#0a192f" }}>
                <div className="label" style={{ color: "#94a3b8" }}>Percent increase</div>
                <div className="value" style={{ color: "#fff" }}>{result.pctIncrease.toFixed(1)}%</div>
              </div>
            </div>
            <p className="muted" style={{ marginTop: 16, fontSize: 15 }}>
              Escalating <strong>{formatCurrency(parsed.b)}</strong> at <strong>{parsed.r}%</strong> per year
              {mode === "compound" ? " (compounded annually)" : " (simple)"} over{" "}
              <strong>{parsed.p} {periodLabel}</strong> projects to about{" "}
              <strong>{formatCurrency(result.projectedCost)}</strong> — an estimated increase of{" "}
              <strong>{formatCurrency(result.dollarIncrease)}</strong>. This is a generalized estimate from your own
              assumptions, not a contractor quote or a guaranteed future cost.
            </p>
          </>
        ) : (
          <p className="callout" style={{ marginTop: 20, borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c" }}>
            Enter a valid, non-negative number for {parsed.invalid.join(", ")} to see the projection.
          </p>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
