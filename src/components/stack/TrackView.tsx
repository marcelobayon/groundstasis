"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Fires a GA4 view event once on mount. Lets server-rendered directory pages
// record a view without becoming client components themselves.
export function TrackView({
  event,
  params,
}: {
  event: string;
  params?: Record<string, string | number | boolean>;
}) {
  useEffect(() => {
    track(event, params ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
