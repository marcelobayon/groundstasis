"use client";

import { useState } from "react";

// Passwordless account sign-in. POSTs the email to /api/magic-link, which emails
// a secure account-scoped link to /account. Never reveals whether the email has
// an account (the server responds identically either way).

export function SignInForm({ reason }: { reason?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setMsg("Enter a valid email.");
      return;
    }
    setStatus("sending");
    setMsg(null);
    try {
      const res = await fetch("/api/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatus(res.ok ? "sent" : "error");
      if (!res.ok) setMsg("Something went wrong — try again in a moment.");
    } catch {
      setStatus("error");
      setMsg("Couldn't reach the server — try again.");
    }
  }

  if (status === "sent") {
    return (
      <div style={{ maxWidth: 440 }}>
        <div className="eyebrow">Check your email</div>
        <h1 style={{ fontSize: 28, margin: "10px 0 8px" }}>Your sign-in link is on its way</h1>
        <p className="muted">
          If <strong>{email}</strong> has a Ground Stasis account, we just emailed a secure link that opens your
          dashboard. It expires shortly for security.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <div className="eyebrow">Account</div>
      <h1 style={{ fontSize: 28, margin: "10px 0 8px" }}>Sign in to Ground Stasis</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        {reason === "expired"
          ? "That link expired. Enter your email and we'll send a fresh one."
          : "Enter the email on your account and we'll email a secure sign-in link — no password."}
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="acct-email">Email</label>
          <input
            id="acct-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@lender.com"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
        {msg ? (
          <p className="small muted" style={{ marginTop: 10 }}>
            {msg}
          </p>
        ) : null}
      </form>
    </div>
  );
}
