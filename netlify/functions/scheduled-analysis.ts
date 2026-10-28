import type { Config } from "@netlify/functions";

// Netlify Scheduled Function — pings the internal analysis endpoint on a cron.
// Keeping it a thin trigger (rather than importing the whole engine here) avoids
// bundling complexity; the real work lives in /api/analyze.
//
// Cadence: every 6 hours. Sentinel-2 produces at most a few usable scenes per
// week, so more frequent runs waste nothing but add no value.
export default async function handler(): Promise<Response> {
  const base = process.env.APP_URL ?? "";
  const adminSecret = process.env.ADMIN_SECRET ?? "";
  if (!base) {
    return new Response("APP_URL not set; skipping scheduled analysis.", { status: 200 });
  }
  try {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "x-admin-secret": adminSecret },
    });
    const text = await res.text();
    return new Response(`analysis trigger status=${res.status} body=${text.slice(0, 300)}`, {
      status: res.ok ? 200 : 502,
    });
  } catch (err) {
    return new Response(`scheduled analysis failed: ${err instanceof Error ? err.message : err}`, {
      status: 500,
    });
  }
}

export const config: Config = {
  schedule: "0 */6 * * *",
};
