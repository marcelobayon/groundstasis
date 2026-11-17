import { getMagicLinkSecrets } from "@/lib/env";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { recordUnsubscribe } from "@/lib/email/compliance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// One-click marketing unsubscribe. GET renders a confirmation page (so an email
// client that pre-fetches links cannot silently opt someone out); the single
// button POSTs back here to record the suppression. Tokens are non-expiring and
// signed, so no login is required — a recipient can always opt out.

function page(title: string, bodyHtml: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Ground Stasis</title></head>
<body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0A192F;">
<div style="max-width:520px;margin:48px auto;padding:24px;">
  <div style="font-weight:700;letter-spacing:.14em;font-size:13px;color:#64748B;text-transform:uppercase;">Ground Stasis</div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-top:12px;overflow:hidden;">
    <div style="height:4px;background:#FF6B00;"></div>
    <div style="padding:28px;">${bodyHtml}</div>
  </div>
</div></body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = verifyUnsubscribeToken(token, getMagicLinkSecrets());
  if (!result.valid) {
    return page(
      "Unsubscribe",
      `<h1 style="margin:0 0 8px;font-size:20px;">This unsubscribe link isn't valid</h1>
       <p style="margin:0;font-size:14px;color:#64748B;line-height:1.6;">The link may be incomplete. Reply to any Ground Stasis email and we'll remove you.</p>`,
    );
  }
  const safeEmail = result.email.replace(/</g, "&lt;");
  return page(
    "Unsubscribe",
    `<h1 style="margin:0 0 8px;font-size:20px;">Unsubscribe from marketing emails?</h1>
     <p style="margin:0 0 18px;font-size:14px;color:#64748B;line-height:1.6;">This stops portfolio digests and product updates sent to <strong>${safeEmail}</strong>. You'll still get service alerts for any sites you actively monitor.</p>
     <form method="post" action="/api/unsubscribe">
       <input type="hidden" name="token" value="${token.replace(/"/g, "&quot;")}">
       <button type="submit" style="background:#FF6B00;color:#fff;border:0;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px;cursor:pointer;">Confirm unsubscribe</button>
     </form>`,
  );
}

export async function POST(request: Request): Promise<Response> {
  let token = "";
  const ct = request.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      token = ((await request.json()) as { token?: string }).token ?? "";
    } else {
      token = String((await request.formData()).get("token") ?? "");
    }
  } catch {
    token = "";
  }

  const result = verifyUnsubscribeToken(token, getMagicLinkSecrets());
  if (!result.valid) {
    return page(
      "Unsubscribe",
      `<h1 style="margin:0 0 8px;font-size:20px;">This unsubscribe link isn't valid</h1>
       <p style="margin:0;font-size:14px;color:#64748B;line-height:1.6;">Reply to any Ground Stasis email and we'll remove you.</p>`,
    );
  }

  await recordUnsubscribe(result.email);
  const safeEmail = result.email.replace(/</g, "&lt;");
  return page(
    "Unsubscribed",
    `<h1 style="margin:0 0 8px;font-size:20px;">You're unsubscribed</h1>
     <p style="margin:0;font-size:14px;color:#64748B;line-height:1.6;"><strong>${safeEmail}</strong> won't receive further marketing emails from Ground Stasis. Service alerts for monitored sites are unaffected.</p>`,
  );
}
