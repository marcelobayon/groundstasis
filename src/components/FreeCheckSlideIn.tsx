"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

// Calm, value-first prompt to the FREE activity check — not an exit-intent
// trap. Appears once (after a 30s dwell or scrolling past 60% of the page),
// is easily dismissed, and stays dismissed for a week. Hidden on the product /
// account / checkout routes and on the check page itself.
const HIDE_PREFIXES = [
  "/account",
  "/setup",
  "/check",
  "/site",
  "/s/",
  "/admin",
  "/construction-activity-check",
];
const DISMISS_KEY = "gs_freecheck_dismissed";
const DISMISS_MS = 7 * 86_400_000;

export function FreeCheckSlideIn() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pathname || HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
      return;
    }
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const until = Number(raw);
        if (Number.isFinite(until) && Date.now() < until) return;
      }
    } catch {
      /* storage unavailable — carry on */
    }

    let fired = false;
    const reveal = () => {
      if (fired) return;
      fired = true;
      setShow(true);
      track("cta_click", { location: "slide_in_view" });
    };
    const timer = setTimeout(reveal, 30_000);
    const onScroll = () => {
      const h = document.body.scrollHeight;
      if (h > 0 && (window.scrollY + window.innerHeight) / h > 0.6) reveal();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Free construction activity check"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        left: "auto",
        maxWidth: "min(340px, calc(100vw - 32px))",
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        boxShadow: "0 12px 32px rgba(10,25,47,.18)",
        padding: "18px 18px 16px",
        zIndex: 60,
        color: "#0A192F",
      }}
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: 8,
          right: 10,
          border: "none",
          background: "none",
          fontSize: 20,
          lineHeight: 1,
          color: "#94A3B8",
          cursor: "pointer",
        }}
      >
        ×
      </button>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#FF6B00" }}>
        New here?
      </div>
      <p style={{ margin: "6px 0 14px", fontSize: 14, lineHeight: 1.5, color: "#334155" }}>
        See your monitoring blind spot on one financed site — a free activity check, no signup.
      </p>
      <Link
        href="/construction-activity-check"
        onClick={() => track("cta_click", { location: "slide_in" })}
        style={{
          display: "inline-block",
          background: "#FF6B00",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          padding: "9px 16px",
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Run a free check
      </Link>
    </div>
  );
}
