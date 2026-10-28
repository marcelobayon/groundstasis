"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

/**
 * GA4 page_view on client-side navigation.
 *
 * The gtag `config` call already sends the FIRST page_view on load, so we skip
 * the initial mount here to avoid double-counting and to dodge any race with
 * gtag.js loading. Every subsequent App-Router navigation fires a page_view —
 * without this, SPA route changes are invisible to GA.
 */
export function RouteAnalytics() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    track("page_view", {
      page_path: pathname,
      page_location: typeof window !== "undefined" ? window.location.href : pathname,
      page_title: typeof document !== "undefined" ? document.title : "",
    });
  }, [pathname]);
  return null;
}
