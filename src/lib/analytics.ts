// Google Analytics (GA4) event helpers. The measurement id is injected in the
// root layout; this module provides a typed `track()` and the event catalogue
// from the spec. Never pass sensitive data (loan amounts, emails, coordinates)
// into event params.

import { SITE } from "@/lib/config/site";

export const GA_EVENTS = {
  landingView: "landing_view",
  ctaClick: "cta_click",
  checkoutStarted: "checkout_started",
  checkoutCompleted: "checkout_completed",
  siteSetupStarted: "site_setup_started",
  siteCreated: "site_created",
  polygonCreated: "polygon_created",
  monitoringStarted: "monitoring_started",
  dashboardView: "dashboard_view",
  evidenceView: "evidence_view",
  alertGenerated: "alert_generated",
  alertOpened: "alert_opened",
  subscriptionCancelled: "subscription_cancelled",
  // funnel + Construction Draw Intelligence
  siteCheckStarted: "site_check_started",
  siteCheckCompleted: "site_check_completed",
  siteReportViewed: "site_report_viewed",
  drawIntelligenceOfferViewed: "draw_intelligence_offer_viewed",
  drawIntelligenceOfferClicked: "draw_intelligence_offer_clicked",
  monitoringPlanSelected: "monitoring_plan_selected",
  subscriptionCheckoutStarted: "subscription_checkout_started",
  subscriptionCheckoutCompleted: "subscription_checkout_completed",
  drawIntelligenceEnabled: "draw_intelligence_enabled",
  subscriptionCanceled: "subscription_canceled",
  // --- SEO free-tool funnel (roadmap Tiers 1–3) ---------------------------
  // Additive: existing commerce events above are unchanged to preserve GA
  // history. These are new and carry the consistent tool/content params below.
  seoToolStart: "seo_tool_start",
  seoToolComplete: "seo_tool_complete",
  seoToolValidationError: "seo_tool_validation_error",
  fileDownload: "file_download",
  generateLead: "generate_lead",
} as const;

export type GaEvent = (typeof GA_EVENTS)[keyof typeof GA_EVENTS];

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function track(event: GaEvent | string, params: Record<string, string | number | boolean> = {}): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}

// ---------------------------------------------------------------------------
// SEO free-tool helpers (Tiers 1–3).
//
// Consistent parameter dictionary across every tool and content page:
//   tool_name, tool_type, content_tier, page_path, cta_location, source_page.
// NEVER pass user-entered financial values, emails, addresses/coordinates,
// magic-link tokens, or Stripe ids into any of these.
// ---------------------------------------------------------------------------

export type ToolType = "calculator" | "template" | "interactive_check";
export type ContentTier = "tier_1" | "tier_2" | "tier_3" | "existing";

export interface ToolMeta {
  tool_name: string;
  tool_type: ToolType;
  content_tier: ContentTier;
  /** Optional explicit path; defaults to the current pathname. */
  page_path?: string;
}

function resolvePath(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof window !== "undefined") return window.location.pathname;
  return "";
}

/** Fire once when the user meaningfully begins interacting with a tool. */
export function trackToolStart(meta: ToolMeta): void {
  track(GA_EVENTS.seoToolStart, {
    tool_name: meta.tool_name,
    tool_type: meta.tool_type,
    content_tier: meta.content_tier,
    page_path: resolvePath(meta.page_path),
  });
}

/** Fire when a valid result or usable template has been produced. */
export function trackToolComplete(meta: ToolMeta, completionStatus: string = "success"): void {
  track(GA_EVENTS.seoToolComplete, {
    tool_name: meta.tool_name,
    tool_type: meta.tool_type,
    content_tier: meta.content_tier,
    completion_status: completionStatus,
    page_path: resolvePath(meta.page_path),
  });
}

/** Fire on a meaningful validation failure — generic category only, never values. */
export function trackToolValidationError(toolName: string, errorType: string): void {
  track(GA_EVENTS.seoToolValidationError, { tool_name: toolName, error_type: errorType });
}

/** Fire on a successful template/file download. */
export function trackFileDownload(fileName: string, contentTier: ContentTier, sourcePage?: string): void {
  track(GA_EVENTS.fileDownload, {
    file_name: fileName,
    content_tier: contentTier,
    source_page: resolvePath(sourcePage),
  });
}

// ---------------------------------------------------------------------------
// GA4 client_id capture (for the server-side purchase event, Decision D).
//
// Read the visitor's GA4 client_id so checkout can carry it through Stripe
// metadata and the webhook can attribute the verified `purchase` to the
// original session. Tries gtag first, falls back to parsing the `_ga` cookie.
// Returns undefined if neither is available (purchase is then skipped, never
// faked). Call only from client components.
// ---------------------------------------------------------------------------

export async function getGaClientId(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  const gaId = SITE.gaId;

  // 1) Ask gtag directly (most reliable when analytics is loaded + allowed).
  try {
    const viaGtag = await new Promise<string | undefined>((resolve) => {
      if (typeof window.gtag !== "function") {
        resolve(undefined);
        return;
      }
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(undefined);
        }
      }, 800);
      window.gtag("get", gaId, "client_id", (id: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(typeof id === "string" ? id : undefined);
      });
    });
    if (viaGtag) return viaGtag;
  } catch {
    /* ignore and try the cookie */
  }

  // 2) Fallback: parse the `_ga` cookie (GA1.1.<cid1>.<cid2> → "<cid1>.<cid2>").
  try {
    const m = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
    if (m) {
      const parts = decodeURIComponent(m[1]).split(".");
      if (parts.length >= 4) return parts.slice(-2).join(".");
    }
  } catch {
    /* ignore */
  }

  return undefined;
}
