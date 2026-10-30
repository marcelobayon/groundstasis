// Post-check nurture emails.
//
// After someone runs a $9 satellite check, a short, honest sequence explains
// why the gap between inspections is the real risk and offers continuous
// monitoring. Brand candor rules: never claim anomalies we didn't find, never
// manufacture urgency, keep "monitoring signal" language.
//
// Self-contained renderer (its own inline-styled shell), same visual language
// as the alert/digest emails.

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export interface CheckNurtureContext {
  siteName: string | null;
  checkUrl: string; // /check/<token> — re-open their result
  monitoringUrl: string; // where to start continuous monitoring
  gapCalcUrl: string; // the monitoring-gap calculator
}

const DISCLAIMER =
  "Ground Stasis is an independent monitoring signal, not a replacement for physical inspection, appraisal, engineering review, or underwriting judgment. Satellite evidence alone cannot determine whether construction has stopped, or why.";

function shell(title: string, innerHtml: string, ctaUrl: string, ctaLabel: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0A192F;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
  <div style="font-weight:700;letter-spacing:.14em;font-size:13px;color:#64748B;text-transform:uppercase;">Ground Stasis</div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-top:12px;overflow:hidden;">
    <div style="height:4px;background:#FF6B00;"></div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 10px;font-size:20px;line-height:1.3;color:#0A192F;">${title}</h1>
      ${innerHtml}
      <a href="${ctaUrl}" style="display:inline-block;margin-top:20px;background:#FF6B00;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;">${ctaLabel}</a>
    </div>
  </div>
  <p style="font-size:12px;line-height:1.6;color:#64748B;margin:16px 4px;">${DISCLAIMER}</p>
</div></body></html>`;
}

function siteLabel(name: string | null): string {
  return name && name.trim() ? name.trim() : "your site";
}

export function renderCheckNurture1(ctx: CheckNurtureContext): RenderedEmail {
  const site = siteLabel(ctx.siteName);
  const subject = "Your satellite check — and the weeks after it";
  const inner = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
      You ran a Ground Stasis check on <strong>${escapeHtml(site)}</strong>. A single check is a snapshot in time —
      useful, but the risk to a construction loan usually lives in the stretch <em>between</em> inspections, when a
      financed site can go quiet for weeks without anyone noticing.
    </p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Two things worth doing next:</p>
    <ul style="margin:0 0 4px;padding-left:20px;font-size:15px;line-height:1.7;color:#0A192F;">
      <li><a href="${ctx.checkUrl}" style="color:#E25F00;">Re-open your check result</a> and the evidence behind it.</li>
      <li><a href="${ctx.gapCalcUrl}" style="color:#E25F00;">See how large your monitoring gap is</a> — the days a site goes unobserved between documented checks.</li>
    </ul>
    <p style="margin:14px 0 0;font-size:15px;line-height:1.6;">
      If the signal was useful on one site, you can have it watched continuously — an email only when it goes unusually
      quiet or starts moving again.
    </p>`;
  const text = [
    `You ran a Ground Stasis check on ${site}.`,
    "",
    "A single check is a snapshot. The risk to a construction loan usually lives in the stretch between inspections — when a site can go quiet for weeks unnoticed.",
    "",
    `Re-open your result: ${ctx.checkUrl}`,
    `See your monitoring gap: ${ctx.gapCalcUrl}`,
    "",
    `Watch this site continuously: ${ctx.monitoringUrl}`,
    "",
    DISCLAIMER,
  ].join("\n");
  return { subject, text, html: shell("What the weeks after a check look like", inner, ctx.monitoringUrl, "Watch this site continuously") };
}

export function renderCheckNurture2(ctx: CheckNurtureContext): RenderedEmail {
  const site = siteLabel(ctx.siteName);
  const subject = "Want this site watched automatically?";
  const inner = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
      You proved the signal on one site with your check on <strong>${escapeHtml(site)}</strong>. Continuous monitoring
      takes it from there: Ground Stasis watches the site on a schedule and emails you only when activity drops
      unusually low — or resumes.
    </p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
      It sits alongside your inspections and fund control, not in place of them. From <strong>$19/month</strong> for one
      site; cancel anytime, no calls.
    </p>`;
  const text = [
    `You proved the signal on one site (${site}).`,
    "",
    "Continuous monitoring watches it on a schedule and emails you only when activity drops unusually low — or resumes. From $19/month for one site. Cancel anytime.",
    "",
    `See monitoring plans: ${ctx.monitoringUrl}`,
    "",
    DISCLAIMER,
  ].join("\n");
  return { subject, text, html: shell("Have this site watched automatically", inner, ctx.monitoringUrl, "See monitoring plans") };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
