"use client";

import { useState } from "react";
import Link from "next/link";

// Opens the Stripe Customer Portal for the signed-in user. POSTs the account
// token to /api/billing-portal, which resolves the Stripe customer from the
// user id and returns a one-time portal URL. No card data ever touches us.
export function BillingButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<React.ReactNode>(null);

  async function open() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url as string;
          return;
        }
        setMsg("Couldn't open the billing portal — try again.");
      } else if (res.status === 404) {
        setMsg(
          <>
            No active subscription on file. <Link href="/#pricing">Start monitoring</Link> to set up billing.
          </>,
        );
      } else {
        setMsg("Couldn't open the billing portal — try again in a moment.");
      }
    } catch {
      setMsg("Couldn't reach the server — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <button className="btn btn-secondary" onClick={open} disabled={busy}>
        {busy ? "Opening…" : "Manage billing"}
      </button>
      <p className="small muted" style={{ marginTop: 8, maxWidth: "60ch" }}>
        {msg ?? "Change your plan, update your card, or cancel — opens the secure Stripe customer portal."}
      </p>
    </div>
  );
}
