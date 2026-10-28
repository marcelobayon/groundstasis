// Market/location pages for "construction loan monitoring in <place>". Driven
// by GSC geo demand (New York, New England) plus the highest-construction 2026
// metros. Blurbs are general, true market context — deliberately NO fabricated
// dollar figures or cited stats (keeps the pages honest + penalty-safe).

export interface MarketLocation {
  slug: string;
  city: string; // display name
  region: string; // state / region
  blurb: string;
}

export const MARKET_LOCATIONS: MarketLocation[] = [
  {
    slug: "new-york",
    city: "New York",
    region: "New York",
    blurb:
      "New York is one of the largest and highest-value construction markets in the country, spanning dense urban redevelopment in the city and steady residential and commercial building across the wider state.",
  },
  {
    slug: "new-england",
    city: "New England",
    region: "the Northeast",
    blurb:
      "New England construction runs across Massachusetts, Connecticut, Rhode Island and their neighbors — a mix of urban infill, suburban residential, and institutional projects.",
  },
  {
    slug: "dallas-fort-worth",
    city: "Dallas–Fort Worth",
    region: "Texas",
    blurb:
      "Dallas–Fort Worth consistently ranks among the nation's leaders for building permits, with a deep pipeline of residential, retail, and industrial construction.",
  },
  {
    slug: "atlanta",
    city: "Atlanta",
    region: "Georgia",
    blurb:
      "Atlanta is one of the Southeast's busiest construction markets, with heavy commercial, industrial, and data-center development alongside sustained residential growth.",
  },
  {
    slug: "charleston-sc",
    city: "Charleston",
    region: "South Carolina",
    blurb:
      "Charleston is among the fastest-growing new-construction markets in the Carolinas, with strong residential demand and expanding suburban development.",
  },
  {
    slug: "greenville-sc",
    city: "Greenville",
    region: "South Carolina",
    blurb:
      "Greenville is a leading Upstate South Carolina growth market, helped by builder-friendly zoning and comparatively low land costs.",
  },
  {
    slug: "boise",
    city: "Boise",
    region: "Idaho",
    blurb:
      "Boise has sustained some of the highest per-capita new-home construction in the Mountain West as the metro keeps expanding.",
  },
  {
    slug: "charlotte",
    city: "Charlotte",
    region: "North Carolina",
    blurb:
      "Charlotte continues a heavy surge in both residential and commercial construction across the fast-growing Carolinas corridor.",
  },
  {
    slug: "houston",
    city: "Houston",
    region: "Texas",
    blurb:
      "Houston is perennially among the top U.S. metros for total building permits, across residential, commercial, and industrial projects.",
  },
  {
    slug: "austin",
    city: "Austin",
    region: "Texas",
    blurb:
      "Austin remains one of Texas's fastest-growing build markets, driven by residential demand and major tech and commercial development.",
  },
  {
    slug: "phoenix",
    city: "Phoenix",
    region: "Arizona",
    blurb:
      "Phoenix is in a long construction boom — master-planned communities, semiconductor and industrial campuses, and large multifamily development.",
  },
  {
    slug: "detroit",
    city: "Detroit",
    region: "Michigan",
    blurb:
      "Detroit is seeing a notable redevelopment wave, with major downtown projects and significant infrastructure investment.",
  },
];

export function getMarket(slug: string): MarketLocation | null {
  return MARKET_LOCATIONS.find((m) => m.slug === slug) ?? null;
}
