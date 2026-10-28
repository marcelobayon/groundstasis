"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { delayCost, formatCurrency } from "@/lib/tools/calc";
import { trackToolStart, trackToolComplete, type ToolMeta } from "@/lib/analytics";

const META: ToolMeta = {
  tool_name: "construction_delay_cost_calculator",
  tool_type: "calculator",
  content_tier: "existing",
};

export function DelayCostCalc() {
  const [balance, setBalance] = useState("1000000");
  const [rate, setRate] = useState("11");
  const [carry, setCarry] = useState("");
  const [delay, setDelay] = useState("3");

  const startedRef = useRef(false);
  const completedRef = useRef(false);

  function touch() {
    if (!startedRef.current) {
      startedRef.current = true;
      trackToolStart(META);
    }
  }

  const r = useMemo(
    () =>
      delayCost({
        loanBalance: Number(balance) || 0,
        annualRatePct: Number(rate) || 0,
        monthlyCarry: carry ? Number(carry) : 0,
        delayMonths: Number(delay) || 0,
      }),
    [balance, rate, carry, delay]
  );

  useEffect(() => {
    if (!completedRef.current && r.totalDelayCost > 0) {
      completedRef.current = true;
      trackToolComplete(META);
    }
  }, [r.totalDelayCost]);

  const months = Number(delay) || 0;

  return (
    <div className="card">
      <div className="grid grid-2" style={{ gap: 14, marginTop: 0 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Outstanding loan balance ($)</label>
          <input inputMode="numeric" value={balance} onChange={(e) => { touch(); setBalance(e.target.value); }} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Annual interest rate (%)</label>
          <input inputMode="decimal" value={rate} onChange={(e) => { touch(); setRate(e.target.value); }} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Other monthly carrying costs ($, optional)</label>
          <input inputMode="numeric" value={carry} onChange={(e) => { touch(); setCarry(e.target.value); }} placeholder="taxes, insurance…" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Expected delay (months)</label>
          <input inputMode="decimal" value={delay} onChange={(e) => { touch(); setDelay(e.target.value); }} />
        </div>
      </div>

      <div className="statline" style={{ marginTop: 20 }} aria-live="polite">
        <div className="stat">
          <div className="label">Monthly interest</div>
          <div className="value">{formatCurrency(r.monthlyInterest)}</div>
        </div>
        <div className="stat">
          <div className="label">Interest over delay</div>
          <div className="value">{formatCurrency(r.interestOverDelay)}</div>
        </div>
        <div className="stat">
          <div className="label">Carry over delay</div>
          <div className="value">{formatCurrency(r.carryOverDelay)}</div>
        </div>
        <div className="stat" style={{ background: "#0a192f" }}>
          <div className="label" style={{ color: "#94a3b8" }}>Total delay cost</div>
          <div className="value" style={{ color: "#fff" }}>{formatCurrency(r.totalDelayCost)}</div>
        </div>
      </div>

      <p className="muted" style={{ marginTop: 16, fontSize: 15 }}>
        A <strong>{months}-month</strong> delay on this loan costs about{" "}
        <strong>{formatCurrency(r.totalDelayCost)}</strong> — most of it interest you keep paying while
        nothing physical gets built. The expensive part isn&rsquo;t the delay; it&rsquo;s the weeks that pass
        before you know there is one.
      </p>
    </div>
  );
}
