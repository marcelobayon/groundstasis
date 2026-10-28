import type { SiteEvaluation } from "@/lib/analysis/types";
import type { AlertType } from "@/lib/analysis/alerts";
import type { CdiFinding } from "@/lib/cdi/findings";
import { stageLabel } from "@/lib/cdi/findings";
import { formatDate, formatPercent } from "@/lib/format";

// Alert copy. The governing rule: every alert is an ANALYTICAL SIGNAL that
// requires human review. We never say a project "has stopped" or imply fraud or
// abandonment. We describe what the satellite observations did, and what they
// do NOT establish.

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export interface AlertEmailContext {
  siteName: string;
  loanNumber?: string;
  evaluation: SiteEvaluation;
  /** signed magic link to the evidence view */
  viewUrl: string;
}

const DISCLAIMER =
  "Ground Stasis is an independent monitoring signal, not a replacement for physical inspection, appraisal, engineering review, or underwriting judgment. Satellite evidence alone cannot determine whether construction has stopped, or why.";

function htmlShell(
  title: string,
  accent: string,
  inner: string,
  viewUrl: string,
  buttonLabel = "View evidence",
  extraHtml = ""
): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0A192F;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
  <div style="font-weight:700;letter-spacing:.14em;font-size:13px;color:#64748B;text-transform:uppercase;">Ground Stasis</div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-top:12px;overflow:hidden;">
    <div style="height:4px;background:${accent};"></div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 4px;font-size:20px;line-height:1.3;color:#0A192F;">${title}</h1>
      ${inner}
      <a href="${viewUrl}" style="display:inline-block;margin-top:20px;background:#FF6B00;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;">${buttonLabel}</a>
      ${extraHtml}
    </div>
  </div>
  <p style="font-size:12px;line-height:1.6;color:#64748B;margin:16px 4px;">${DISCLAIMER}</p>
</div></body></html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:#64748B;font-size:13px;">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px;color:#0A192F;">${value}</td></tr>`;
}

function statsTable(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;margin-top:12px;border-top:1px solid #e2e8f0;">${rows}</table>`;
}

export function renderStasisAlert(ctx: AlertEmailContext): RenderedEmail {
  const e = ctx.evaluation;
  const s = e.stasis;
  const subject = "Ground Stasis Alert: Construction activity appears unusually quiet";

  const text = [
    `GROUND STASIS ALERT`,
    ``,
    `Project: ${ctx.siteName}`,
    ctx.loanNumber ? `Loan: ${ctx.loanNumber}` : ``,
    `Status: STASIS`,
    ``,
    `Latest usable observation: ${formatDate(e.latestObservation?.date)}`,
    `Previous usable observation: ${formatDate(e.previousObservation?.date)}`,
    `Observed change: ${formatPercent(s.recentChangePercent)}`,
    `Recent baseline: ${formatPercent(s.baselineChangePercent)}`,
    `Low-change span: ~${Math.round(s.lowChangeDurationDays)} days (${s.consecutiveLowChange} consecutive observations)`,
    `Stasis score: ${s.score}/100`,
    `Confidence: ${e.confidence.level}`,
    ``,
    `Why you're receiving this:`,
    `Recent usable satellite observations show materially lower site-level change than the site's established baseline.`,
    ``,
    `What this does NOT mean:`,
    `Satellite imagery alone cannot determine whether construction has actually stopped, or why.`,
    ``,
    `Recommended action:`,
    `Review current borrower/project status, draw documentation, or inspection requirements, and decide whether a site visit is warranted.`,
    ``,
    `View evidence: ${ctx.viewUrl}`,
    ``,
    DISCLAIMER,
  ]
    .filter(Boolean)
    .join("\n");

  const inner = `
    <p style="margin:0;color:#64748B;font-size:13px;">${ctx.siteName}${ctx.loanNumber ? ` · ${ctx.loanNumber}` : ""}</p>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Recent usable satellite observations show <strong>materially lower site-level change</strong> than this site's established baseline.</p>
    ${statsTable(
      row("Observed change", formatPercent(s.recentChangePercent)) +
        row("Recent baseline", formatPercent(s.baselineChangePercent)) +
        row("Low-change span", `~${Math.round(s.lowChangeDurationDays)} days`) +
        row("Latest observation", formatDate(e.latestObservation?.date)) +
        row("Previous observation", formatDate(e.previousObservation?.date)) +
        row("Stasis score", `${s.score}/100`) +
        row("Confidence", e.confidence.level)
    )}
    <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#0A192F;"><strong>What this does not mean:</strong> satellite imagery alone cannot determine whether construction has stopped, or why.</p>
    <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:#0A192F;"><strong>Recommended action:</strong> review borrower/project status, draw documentation, or inspection requirements and decide whether a site visit is warranted.</p>`;

  return { subject, text, html: htmlShell("Stasis signal detected", "#FF6B00", inner, ctx.viewUrl) };
}

export function renderActivityResumed(ctx: AlertEmailContext): RenderedEmail {
  const e = ctx.evaluation;
  const s = e.stasis;
  const subject = "Ground Stasis: Activity detected again";
  const text = [
    `GROUND STASIS`,
    ``,
    `Project: ${ctx.siteName}`,
    `New satellite observations show renewed site-level change following the previous stasis period.`,
    ``,
    `Latest usable observation: ${formatDate(e.latestObservation?.date)}`,
    `Observed change: ${formatPercent(s.recentChangePercent)}`,
    `Confidence: ${e.confidence.level}`,
    ``,
    `This indicates renewed observable site activity. It does not, on its own, confirm that construction has resumed.`,
    ``,
    `View evidence: ${ctx.viewUrl}`,
    ``,
    DISCLAIMER,
  ].join("\n");
  const inner = `
    <p style="margin:0;color:#64748B;font-size:13px;">${ctx.siteName}</p>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">New satellite observations show <strong>renewed site-level change</strong> following the previous stasis period.</p>
    ${statsTable(
      row("Observed change", formatPercent(s.recentChangePercent)) +
        row("Latest observation", formatDate(e.latestObservation?.date)) +
        row("Confidence", e.confidence.level)
    )}
    <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#64748B;">This indicates renewed observable site activity. It does not, on its own, confirm that construction has resumed.</p>`;
  return { subject, text, html: htmlShell("Activity detected again", "#00BFA5", inner, ctx.viewUrl) };
}

export function renderDataGap(ctx: AlertEmailContext): RenderedEmail {
  const subject = "Ground Stasis: Not enough usable imagery right now";
  const text = [
    `GROUND STASIS`,
    ``,
    `Project: ${ctx.siteName}`,
    `Ground Stasis does not currently have enough usable imagery to evaluate recent activity.`,
    `This is a DATA GAP (for example, cloud cover or no recent clean acquisition) — it is NOT a sign of inactivity.`,
    ``,
    `We will resume monitoring automatically as soon as usable observations are available.`,
    ``,
    `View site: ${ctx.viewUrl}`,
    ``,
    DISCLAIMER,
  ].join("\n");
  const inner = `
    <p style="margin:0;color:#64748B;font-size:13px;">${ctx.siteName}</p>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Ground Stasis does not currently have enough usable imagery to evaluate recent activity.</p>
    <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#0A192F;"><strong>This is a data gap, not a sign of inactivity</strong> — for example, cloud cover or no recent clean acquisition. Monitoring resumes automatically once usable observations are available.</p>`;
  return { subject, text, html: htmlShell("Monitoring paused: data gap", "#64748B", inner, ctx.viewUrl) };
}

export function renderObservationAvailable(ctx: AlertEmailContext): RenderedEmail {
  const e = ctx.evaluation;
  const subject = "Ground Stasis: New observation processed";
  const text = [
    `GROUND STASIS`,
    ``,
    `Project: ${ctx.siteName}`,
    `A new usable satellite observation has been processed.`,
    `Latest usable observation: ${formatDate(e.latestObservation?.date)}`,
    `Current status: ${e.status}`,
    ``,
    `View evidence: ${ctx.viewUrl}`,
  ].join("\n");
  const inner = `
    <p style="margin:0;color:#64748B;font-size:13px;">${ctx.siteName}</p>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">A new usable satellite observation has been processed.</p>
    ${statsTable(
      row("Latest observation", formatDate(e.latestObservation?.date)) + row("Current status", e.status)
    )}`;
  return { subject, text, html: htmlShell("New observation processed", "#0A192F", inner, ctx.viewUrl) };
}

export function renderMagicLink(toName: string | undefined, viewUrl: string): RenderedEmail {
  const subject = "Your Ground Stasis monitoring link";
  const text = [
    `GROUND STASIS`,
    ``,
    `Here is your secure monitoring link. It opens your site dashboard and expires shortly for security.`,
    ``,
    viewUrl,
    ``,
    `If you did not request this link, you can ignore this email.`,
  ].join("\n");
  const inner = `
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Here is your secure monitoring link. It opens your site dashboard and expires shortly for security.</p>
    <p style="margin:8px 0 0;font-size:13px;color:#64748B;">If you did not request this link, you can safely ignore this email.</p>`;
  return { subject, text, html: htmlShell("Your monitoring link", "#0A192F", inner, viewUrl) };
}

// --- one-time ($9) single-site check -----------------------------------------

/** Sent the moment payment clears: a secure link to run the check. */
export function renderCheckReady(viewUrl: string): RenderedEmail {
  const subject = "Your Ground Stasis site check is ready to run";
  const text = [
    `GROUND STASIS`,
    ``,
    `Thanks — your single-site check is paid and ready.`,
    `Open the secure link below, enter the construction site (an address is enough),`,
    `and we'll run one live satellite read and show you what the imagery observed.`,
    ``,
    viewUrl,
    ``,
    `This link is private to you. Keep it to return to your results later.`,
    ``,
    DISCLAIMER,
  ].join("\n");
  const inner = `
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Thanks — your single-site check is paid and ready. Open the secure link, enter the construction site (an address is enough), and we&rsquo;ll run one live satellite read and show you what the imagery observed.</p>
    <p style="margin:10px 0 0;font-size:13px;color:#64748B;">This link is private to you — keep it to return to your results later.</p>`;
  return { subject, text, html: htmlShell("Your $9 site check is ready", "#FF6B00", inner, viewUrl, "Open my check") };
}

export interface CheckResultEmailContext {
  siteName?: string;
  evaluation: SiteEvaluation;
  /** secure link back to the full results page */
  viewUrl: string;
  /** link that starts the $19/mo subscription (re-marketing) */
  subscribeUrl: string;
}

/** Sent after the single read completes: the result + the $19/mo upsell. */
export function renderCheckResult(ctx: CheckResultEmailContext): RenderedEmail {
  const e = ctx.evaluation;
  const name = ctx.siteName || "your site";
  const subject = `Ground Stasis check: ${e.status} — ${name}`;
  const text = [
    `GROUND STASIS — SINGLE-SITE CHECK`,
    ``,
    `Site: ${name}`,
    `Status: ${e.status}`,
    `Stasis score: ${e.stasis.score}/100`,
    `Confidence: ${e.confidence.level}`,
    `Latest usable observation: ${formatDate(e.latestObservation?.date)}`,
    `Usable observations analysed: ${e.usableObservationCount}`,
    ``,
    e.explanation,
    ``,
    `Full results: ${ctx.viewUrl}`,
    ``,
    `One read is a snapshot. Risk moves between reads — watch this site every week, automatically, for $19/mo: ${ctx.subscribeUrl}`,
    ``,
    DISCLAIMER,
  ].join("\n");
  const inner = `
    <p style="margin:0;color:#64748B;font-size:13px;">${name}</p>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">${e.explanation}</p>
    ${statsTable(
      row("Status", e.status) +
        row("Stasis score", `${e.stasis.score}/100`) +
        row("Confidence", e.confidence.level) +
        row("Latest observation", formatDate(e.latestObservation?.date)) +
        row("Usable observations", String(e.usableObservationCount))
    )}`;
  const upsell = `
    <div style="margin-top:20px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      <div style="font-weight:700;font-size:14px;color:#0A192F;">One read is a snapshot. Risk moves between reads.</div>
      <p style="margin:6px 0 12px;font-size:13px;line-height:1.6;color:#475569;">Watch this site every week, automatically — an email the moment observed change goes unusually quiet, so a quiet project never becomes a surprise.</p>
      <a href="${ctx.subscribeUrl}" style="display:inline-block;background:#0A192F;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:13px;">Watch this site — $19/mo</a>
    </div>`;
  return {
    subject,
    text,
    html: htmlShell(`Check complete: ${e.status}`, "#0A192F", inner, ctx.viewUrl, "View full results", upsell),
  };
}

// --- Construction Draw Intelligence finding ----------------------------------

const CDI_ACCENT: Record<string, string> = {
  ACTIVITY_CONSISTENT: "#00BFA5",
  ACTIVITY_RESUMED: "#00BFA5",
  REDUCED_ACTIVITY: "#F59E0B",
  POTENTIAL_DISCREPANCY: "#FF6B00",
  NOT_VERIFIABLE: "#64748B",
  INSUFFICIENT_DATA: "#64748B",
};

export interface CdiFindingEmailContext {
  siteName: string;
  finding: CdiFinding;
  /** secure link back to this site's CDI workspace */
  workspaceUrl: string;
}

export function renderCdiFinding(ctx: CdiFindingEmailContext): RenderedEmail {
  const f = ctx.finding;
  const accent = CDI_ACCENT[f.code] ?? "#0A192F";
  const subject = `Draw Intelligence: ${f.title} — ${ctx.siteName}`;
  const text = [
    `GROUND STASIS — CONSTRUCTION DRAW INTELLIGENCE`,
    ``,
    `Site: ${ctx.siteName}`,
    `Finding: ${f.title}`,
    ``,
    f.summary,
    ``,
    `REPORTED (by you / borrower):`,
    `  Stage: ${stageLabel(f.reported.stage)}`,
    f.reported.expectedMilestone ? `  Expected milestone: ${f.reported.expectedMilestone}` : ``,
    f.reported.targetDate ? `  Target date: ${f.reported.targetDate}` : ``,
    f.reported.actualStageReported ? `  Actual stage reported: ${f.reported.actualStageReported}` : ``,
    ``,
    `OBSERVED (satellite):`,
    `  Activity status: ${f.observed.status}`,
    `  Latest usable observation: ${formatDate(f.observed.latestObservationDate ?? undefined)}`,
    `  Usable observations: ${f.observed.usableObservationCount}`,
    f.confidence ? `  Confidence: ${f.confidence}` : ``,
    ``,
    `Recommended next action:`,
    f.action,
    ``,
    `Open the site workspace: ${ctx.workspaceUrl}`,
    ``,
    f.limitations,
  ]
    .filter(Boolean)
    .join("\n");

  const reportedRows =
    row("Reported stage", stageLabel(f.reported.stage)) +
    (f.reported.targetDate ? row("Target date", f.reported.targetDate) : "") +
    (f.reported.actualStageReported ? row("Actual stage reported", f.reported.actualStageReported) : "");
  const observedRows =
    row("Activity status", f.observed.status) +
    row("Latest observation", formatDate(f.observed.latestObservationDate ?? undefined)) +
    row("Usable observations", String(f.observed.usableObservationCount)) +
    (f.confidence ? row("Confidence", f.confidence) : "");

  const inner = `
    <p style="margin:0;color:#64748B;font-size:13px;">${ctx.siteName} · Construction Draw Intelligence</p>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">${f.summary}</p>
    <p style="margin:16px 0 4px;font-weight:700;font-size:12px;letter-spacing:.06em;color:#64748B;text-transform:uppercase;">Reported</p>
    ${statsTable(reportedRows)}
    <p style="margin:16px 0 4px;font-weight:700;font-size:12px;letter-spacing:.06em;color:#64748B;text-transform:uppercase;">Observed (satellite)</p>
    ${statsTable(observedRows)}
    <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#0A192F;"><strong>Recommended next action:</strong> ${f.action}</p>`;

  return { subject, text, html: htmlShell(f.title, accent, inner, ctx.workspaceUrl, "Open site workspace") };
}

export function renderAlertEmail(type: AlertType, ctx: AlertEmailContext): RenderedEmail {
  switch (type) {
    case "STASIS_DETECTED":
      return renderStasisAlert(ctx);
    case "ACTIVITY_RESUMED":
      return renderActivityResumed(ctx);
    case "DATA_GAP":
      return renderDataGap(ctx);
    case "OBSERVATION_AVAILABLE":
      return renderObservationAvailable(ctx);
  }
}
