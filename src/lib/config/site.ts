// Product-level constants used across the UI. Kept free of server-only env so
// it is safe to import from client components. The GA id is a NEXT_PUBLIC_ var
// (safe to expose) with the account default baked in.

export const SITE = {
  name: "Ground Stasis",
  domain: "groundstasis.com",
  url: "https://groundstasis.com",
  tagline: "Know when construction goes quiet.",
  subheadline:
    "Satellite monitoring for construction lenders that flags unusual drops in observable site activity — before a quiet project becomes a surprise.",
  gaId: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "G-F1R30MC86L",
  pricePerSiteMonth: 19,
  alertsFrom: "alerts@groundstasis.com",
  contactEmail: "hello@groundstasis.com",
} as const;

export const BRAND = {
  primary: "#0A192F",
  secondary: "#64748B",
  action: "#FF6B00",
  success: "#00BFA5",
} as const;
