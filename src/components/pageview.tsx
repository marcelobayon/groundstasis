"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Fires a GA event once on mount. Used for *_view events. */
export function PageView({ event, params }: { event: string; params?: Record<string, string | number | boolean> }) {
  useEffect(() => {
    track(event, params ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
