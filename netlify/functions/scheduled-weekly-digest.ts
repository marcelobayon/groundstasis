import type { Config } from "@netlify/functions";

// Netlify Scheduled Function — fires the weekly portfolio digest every Monday.
// Thin trigger (mirrors scheduled-webhook-delivery.ts); the real work lives in
// /api/cron/send-digests so the engine stays out of the function bundle and is
// unit-testable.
//
// Schedule: Mondays 13:00 UTC (~07:00 US Eastern / ~06:00 Central) — a Monday
// morning arrival for US lenders. Declared here via `export const config` (same
// convention as scheduled-webhook-delivery.ts), so no netlify.toml change.
export default async function handler(): Promise<Response> {
  const base = process.env.APP_URL ?? "";
  const adminSecret = process.env.ADMIN_SECRET ?? "";
  if (!base) {
    return new Response("APP_URL not set; skipping weekly digest.", { status: 200 });
  }
  try {
    const res = await fetch(`${base}/api/cron/send-digests`, {
      method: "POST",
      headers: { "x-admin-secret": adminSecret },
    });
    const text = await res.text();
    return new Response(`weekly digest status=${res.status} body=${text.slice(0, 300)}`, {
      status: res.ok ? 200 : 502,
    });
  } catch (err) {
    return new Response(`scheduled weekly digest failed: ${err instanceof Error ? err.message : err}`, {
      status: 500,
    });
  }
}

export const config: Config = {
  schedule: "0 13 * * 1",
};
