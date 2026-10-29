// Weekly portfolio digest email.
//
// "Software that checks for you": every Monday the lender gets a one-glance
// rollup of their monitored portfolio and the short list of sites that deserve
// a look — without logging in. Copy follows the brand candor rules: a
// "monitoring signal," never "stopped"/"abandoned"; a DATA_GAP is missing
// evidence, not inactivity.
//
// Self-contained renderer (its own inline-styled shell) so it doesn't depend on
// the private helpers in templates.ts. Keep the visual language in sync with
// that file's htmlShell if you restyle the brand email look.

import type { PortfolioSummary } from "@/lib/reports/portfolio";
import { STATUS_META, STATUS_ORDER } from "@/lib/reports/portfolio";

export interface WeeklyDigestContext {
  portfolio: PortfolioSummary;
  /** Where "View portfolio" points (the account sign-in page). */
  accountUrl: string;
  /** Human label for the week, e.g. "week of Oct 28, 2026". */
  periodLabel: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const DISCLAIMER =
  "Ground Stasis is an independent monitoring signal, not a replacement for physical inspection, appraisal, engineering review, or underwriting judgment. Satellite evidence alone cannot determine whether construction has stopped, or why.";

function subjectFor(p: PortfolioSummary, periodLabel: string): string {
  if (p.total === 0) return `Your construction portfolio — ${periodLabel}`;
  if (p.exceptionCount === 0) {
    return `All ${p.total} monitored ${p.total === 1 ? "site is" : "sites"} active — ${periodLabel}`;
  }
  return `${p.exceptionCount} ${p.exceptionCount === 1 ? "site needs" : "sites need"} a look — ${periodLabel}`;
}

export function renderWeeklyDigest(ctx: WeeklyDigestContext): RenderedEmail {
  const { portfolio: p, accountUrl, periodLabel } = ctx;
  const subject = subjectFor(p, periodLabel);

  // ---- plain text ----------------------------------------------------------
  const textLines: string[] = [
    `Ground Stasis — weekly portfolio digest (${periodLabel})`,
    "",
    p.total === 1
      ? "Your 1 monitored construction project:"
      : `Your ${p.total} monitored construction projects:`,
  ];
  for (const status of STATUS_ORDER) {
    const n = p.counts[status];
    if (n > 0) textLines.push(`  ${STATUS_META[status].dot} ${n} ${STATUS_META[status].label.toLowerCase()}`);
  }
  if (p.exceptionCount > 0) {
    textLines.push("", "Worth a look:");
    for (const s of p.exceptions) {
      textLines.push(
        `  - ${s.name} — ${STATUS_META[s.status].label} (stasis ${s.stasisScore}/100, ${s.confidence.toLowerCase()} confidence)`,
      );
    }
  }
  textLines.push("", `View your portfolio: ${accountUrl}`, "", DISCLAIMER);
  const text = textLines.join("\n");

  // ---- html ----------------------------------------------------------------
  const rollupRows = STATUS_ORDER.map((status) => {
    const n = p.counts[status];
    const meta = STATUS_META[status];
    const dim = n === 0 ? "opacity:.45;" : "";
    return `<tr style="${dim}">
      <td style="padding:7px 0;font-size:14px;color:#0A192F;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${meta.color};margin-right:10px;vertical-align:middle;"></span>${meta.label}
      </td>
      <td style="padding:7px 0;text-align:right;font-weight:700;font-size:15px;color:#0A192F;">${n}</td>
    </tr>`;
  }).join("");

  const exceptionsHtml =
    p.exceptionCount === 0
      ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#0A192F;">No sites need attention this week. Every monitored site is reading as active or easing.</p>`
      : `<p style="margin:20px 0 6px;font-weight:700;font-size:12px;letter-spacing:.06em;color:#64748B;text-transform:uppercase;">Worth a look</p>
         <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;">
         ${p.exceptions
           .map(
             (s) => `<tr>
             <td style="padding:8px 0;font-size:14px;color:#0A192F;">
               <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${STATUS_META[s.status].color};margin-right:9px;vertical-align:middle;"></span>${escapeHtml(s.name)}
               <div style="margin:2px 0 0 18px;font-size:12px;color:#64748B;">${STATUS_META[s.status].label} · stasis ${s.stasisScore}/100 · ${s.confidence.toLowerCase()} confidence</div>
             </td>
           </tr>`,
           )
           .join("")}
         </table>`;

  const intro =
    p.total === 0
      ? `You have no monitored sites yet. Add a site to start receiving weekly intelligence.`
      : `Your ${p.total} monitored construction ${p.total === 1 ? "project" : "projects"}, at a glance.`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0A192F;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
  <div style="font-weight:700;letter-spacing:.14em;font-size:13px;color:#64748B;text-transform:uppercase;">Ground Stasis</div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-top:12px;overflow:hidden;">
    <div style="height:4px;background:#FF6B00;"></div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 4px;font-size:20px;line-height:1.3;color:#0A192F;">Weekly portfolio intelligence</h1>
      <p style="margin:0 0 4px;font-size:13px;color:#64748B;">${escapeHtml(periodLabel)}</p>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#0A192F;">${escapeHtml(intro)}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:14px;border-top:1px solid #e2e8f0;">${rollupRows}</table>
      ${exceptionsHtml}
      <a href="${escapeAttr(accountUrl)}" style="display:inline-block;margin-top:22px;background:#FF6B00;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;">View your portfolio</a>
    </div>
  </div>
  <p style="font-size:12px;line-height:1.6;color:#64748B;margin:16px 4px;">${DISCLAIMER}</p>
</div></body></html>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
