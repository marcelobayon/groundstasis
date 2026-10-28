import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config/site";
import { MARKET_LOCATIONS } from "@/lib/seo/locations";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/methodology",
    "/privacy",
    "/terms",
    // Monitoring hub + guides
    "/construction-loan-monitoring",
    "/construction-lender-monitoring",
    "/satellite-construction-monitoring",
    "/construction-loan-risk-monitoring",
    "/vet-monitor-builders-construction-lending-risk",
    // Tools & checklists
    "/tools",
    "/media-kit",
    "/construction-draw-intelligence",
    "/construction-loan-monitoring-checklist",
    "/construction-draw-inspection-checklist",
    "/construction-draw-inspection-form",
    "/utility-construction-inspection-form",
    "/construction-delay-cost-calculator",
    "/construction-escalation-calculator",
    "/construction-monitoring-gap-calculator",
    "/construction-activity-check",
    "/docs",
    "/integrations/zapier",
    ...MARKET_LOCATIONS.map((m) => `/construction-loan-monitoring/${m.slug}`),
  ];
  const now = new Date();
  return routes.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
