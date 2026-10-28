import type { Config } from "@netlify/functions";

// Netlify Scheduled Function — pings the internal delivery endpoint every
// minute. Thin trigger (mirrors scheduled-analysis.ts); the real draining lives
// in /api/cron/deliver-webhooks so the engine stays out of the function bundle.
export default async function handler(): Promise<Response> {
  const base = process.env.APP_URL ?? "";
  const adminSecret = process.env.ADMIN_SECRET ?? "";
  if (!base) {
    return new Response("APP_URL not set; skipping webhook delivery.", { status: 200 });
  }
  try {
    const res = await fetch(`${base}/api/cron/deliver-webhooks`, {
      method: "POST",
      headers: { "x-admin-secret": adminSecret },
    });
    const text = await res.text();
    return new Response(`webhook delivery status=${res.status} body=${text.slice(0, 300)}`, {
      status: res.ok ? 200 : 502,
    });
  } catch (err) {
    return new Response(`scheduled webhook delivery failed: ${err instanceof Error ? err.message : err}`, {
      status: 500,
    });
  }
}

export const config: Config = {
  schedule: "* * * * *",
};
