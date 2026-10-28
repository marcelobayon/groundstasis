"use client";

import * as React from "react";
import { track } from "@/lib/analytics";

/** A link styled as a button that fires a GA event on click. */
export function CtaButton({
  href,
  event,
  params,
  children,
  variant = "primary",
  size,
}: {
  href: string;
  event: string;
  params?: Record<string, string | number | boolean>;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm";
}) {
  return (
    <a
      href={href}
      className={`btn btn-${variant}${size === "sm" ? " btn-sm" : ""}`}
      onClick={() => track(event, params ?? {})}
    >
      {children}
    </a>
  );
}
