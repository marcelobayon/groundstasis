import type { Config } from "@netlify/functions";

// Netlify Scheduled Function — runs the post-check nurture sequence once a day.
// Thin trigger (mirrors scheduled-webhook-delivery.ts); the real work lives in
// /api/cron/check-nurture. The sequence is age-gated per email, so the exact
// time of day doesn't matter; 15:00 UTC keeps it off peak.
export default async function handler(): Promise<Response> {
  const base = process.env.APP_URL ?? "";
  const adminSecret = process.env.ADMIN_SECRET ?? "";
  if (!base) {
    return new Response("APP_URL not set; skipping check nurture.", { status: 200 });
  }
  try {
    const res = await fetch(`${base}/api/cron/check-nurture`, {
      method: "POST",
      headers: { "x-admin-secret": adminSecret },
    });
    const text = await res.text();
    return new Response(`check nurture status=${res.status} body=${text.slice(0, 300)}`, {
      status: res.ok ? 200 : 502,
    });
  } catch (err) {
    return new Response(`scheduled check nurture failed: ${err instanceof Error ? err.message : err}`, {
      status: 500,
    });
  }
}

export const config: Config = {
  schedule: "0 15 * * *",
};
