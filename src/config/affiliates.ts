// Construction Lender Stack — single source of truth for the directory.
//
// This drives the hub (/construction-lender-stack) and every category page.
// Two kinds of entries:
//   - Ground Stasis tools (isGroundStasis: true)  -> internal links into our funnel.
//   - Third-party partners                        -> labeled external links.
//
// RULES (enforced by convention; keep them):
//   - Never invent an affiliate URL, tracking param, approval, or commission.
//   - affiliateUrl stays null until a program actually approves you; the card
//     then shows a labeled "Visit official website" CTA to officialUrl instead.
//   - Only disclosureRequired: true on genuinely monetized links.
//   - Prospective partners stay programStatus "researching" — never presented
//     as an approved Ground Stasis partner.

export type ProgramStatus =
  | "researching"
  | "applied"
  | "approved"
  | "rejected"
  | "not_available";

export type RelationshipType =
  | "affiliate"
  | "referral"
  | "integration"
  | "distribution"
  | "ordinary_resource"
  | "ground_stasis"; // our own tool/product

export interface StackPartner {
  id: string;
  name: string;
  description: string; // what it is / the problem it solves
  bestFor: string; // intended audience
  officialUrl?: string; // verified official site (external)
  internalHref?: string; // our own route (Ground Stasis tools)
  affiliateUrl?: string | null; // paste ONLY when approved; null until then
  ctaLabel: string;
  relationshipType: RelationshipType;
  programStatus?: ProgramStatus;
  disclosureRequired?: boolean;
  isGroundStasis?: boolean;
}

export interface CategoryFaq {
  q: string;
  a: string;
}

export interface StackCategory {
  slug: string;
  name: string; // nav/display name
  title: string; // SEO <title>
  metaDescription: string;
  h1: string;
  intro: string; // unique intro paragraph (search intent + framing)
  servedByGroundStasis: boolean;
  partners: StackPartner[];
  faqs: CategoryFaq[];
  isPublished: boolean; // controls sitemap + hub nav
}

export const STACK_CATEGORIES: StackCategory[] = [
  // ---- Ground Stasis-served category: refers to OUR OWN tools ----------------
  {
    slug: "site-monitoring",
    name: "Site monitoring & draw inspection",
    title: "Construction Site Monitoring & Draw Inspection Tools for Lenders",
    metaDescription:
      "The monitoring layer of the construction lender stack: how to watch a financed site between draw inspections, plus free calculators and a $9 satellite activity check from Ground Stasis.",
    h1: "Site monitoring & draw inspection",
    intro:
      "The gap between scheduled draw inspections is where a financed project can quietly stall without anyone noticing. This part of the stack is about closing that gap — an independent read on whether a site is actually moving. Ground Stasis serves this layer directly, so the tools below are ours: start with a free calculator or a one-time $9 satellite check, then monitor continuously if it earns its place.",
    servedByGroundStasis: true,
    partners: [
      {
        id: "gs-site-check",
        name: "Satellite Site Check ($9)",
        description:
          "A one-time satellite read on a single financed site: status, a 0–100 stasis score, and confidence, delivered as a secure link. The no-commitment way to see the signal on a real project.",
        bestFor: "Lenders testing the idea on one site before committing.",
        internalHref: "/construction-activity-check",
        ctaLabel: "Run a free activity check",
        relationshipType: "ground_stasis",
        isGroundStasis: true,
      },
      {
        id: "gs-monitoring",
        name: "Continuous Monitoring",
        description:
          "Ongoing satellite monitoring of 1–10 financed sites with email alerts when a site goes unusually quiet or activity resumes. From $19/mo. An independent signal alongside your inspections and fund control — not a replacement.",
        bestFor: "Lenders who want a standing signal across a portfolio.",
        internalHref: "/construction-loan-monitoring",
        ctaLabel: "How monitoring works",
        relationshipType: "ground_stasis",
        isGroundStasis: true,
      },
      {
        id: "gs-cdi",
        name: "Construction Draw Intelligence",
        description:
          "Compares a reported construction milestone against what the satellite evidence shows, and raises a confidence-rated finding when they diverge. Reported and observed are always kept separate. $15/site/mo add-on.",
        bestFor: "Lenders reconciling draw requests against site reality.",
        internalHref: "/construction-draw-intelligence",
        ctaLabel: "See how it works",
        relationshipType: "ground_stasis",
        isGroundStasis: true,
      },
      {
        id: "gs-gap-calc",
        name: "Monitoring Gap Calculator",
        description:
          "Estimate how much of a financed project's timeline is passing unobserved between documented checks — an operational planning estimate, not a prediction of loss.",
        bestFor: "Lenders sizing their between-inspection blind spot.",
        internalHref: "/construction-monitoring-gap-calculator",
        ctaLabel: "Open the calculator",
        relationshipType: "ground_stasis",
        isGroundStasis: true,
      },
      {
        id: "gs-draw-form",
        name: "Draw Inspection Form",
        description:
          "A practical, free draw-inspection form to standardize what gets captured on each site visit.",
        bestFor: "Teams organizing their draw-inspection workflow.",
        internalHref: "/construction-draw-inspection-form",
        ctaLabel: "Open the form",
        relationshipType: "ground_stasis",
        isGroundStasis: true,
      },
      {
        id: "gs-delay-calc",
        name: "Delay Cost Calculator",
        description:
          "Estimate the carrying cost of a construction delay from your own inputs — budget, delay duration, and a carrying-cost assumption you enter.",
        bestFor: "Lenders quantifying the exposure a stall creates.",
        internalHref: "/construction-delay-cost-calculator",
        ctaLabel: "Open the calculator",
        relationshipType: "ground_stasis",
        isGroundStasis: true,
      },
    ],
    faqs: [
      {
        q: "Does satellite monitoring replace a draw inspection?",
        a: "No. It is an independent signal that a site is or isn't visibly progressing between inspections. It does not verify work quality, completed value, or draw eligibility, and it never replaces a physical inspection or your underwriting judgment.",
      },
      {
        q: "What happens when there's no usable satellite image?",
        a: "It's reported as a data gap — missing evidence — never as 'no activity.' Imagery availability varies with satellite acquisition and weather.",
      },
    ],
    isPublished: true,
  },

  // ---- Third-party categories (prospective partners; seeded from research) ----
  {
    slug: "property-data",
    name: "Property data",
    title: "Property Data Tools for Construction Lenders",
    metaDescription:
      "Property records, ownership, and transaction data that complement construction loan monitoring. A curated look at property-data tools for lenders and capital providers.",
    h1: "Property data for construction lenders",
    intro:
      "Property records, ownership history, and transaction data help a lender understand the parcel behind a construction loan — who owns it, what it last sold for, and how it's characterized. This is context around a site; Ground Stasis watches whether the site is moving. They answer different questions and work well side by side.",
    servedByGroundStasis: false,
    partners: [
      {
        id: "attom",
        name: "ATTOM",
        description:
          "A large property-data provider: ownership and transaction records, property characteristics, and risk-related data, available via licensing and partnerships.",
        bestFor: "Lenders who want parcel-level property context at scale.",
        officialUrl: "https://www.attomdata.com/",
        affiliateUrl: null,
        ctaLabel: "Visit official website",
        relationshipType: "referral",
        programStatus: "researching",
        disclosureRequired: false,
      },
    ],
    faqs: [
      {
        q: "Is Ground Stasis integrated with ATTOM?",
        a: "No. ATTOM is listed here as a complementary tool category, not as an existing integration or an approved Ground Stasis partner.",
      },
    ],
    isPublished: true,
  },
  {
    slug: "accounting",
    name: "Accounting",
    title: "Accounting Software for Construction Lenders & Borrowers",
    metaDescription:
      "Small-business accounting and bookkeeping tools that fit around construction lending workflows. A curated category in the construction lender stack.",
    h1: "Accounting software",
    intro:
      "Accounting and bookkeeping software keeps the financial side of a lending operation — and of the builders you fund — organized. It sits on the books side of the stack; Ground Stasis sits on the site side. Different jobs, same portfolio.",
    servedByGroundStasis: false,
    partners: [
      {
        id: "quickbooks",
        name: "QuickBooks",
        description:
          "Widely used small-business accounting and bookkeeping software from Intuit, with a published business affiliate program.",
        bestFor: "Small lenders and the builders they finance.",
        officialUrl: "https://quickbooks.intuit.com/",
        affiliateUrl: null,
        ctaLabel: "Visit official website",
        relationshipType: "affiliate",
        programStatus: "researching",
        disclosureRequired: false,
      },
    ],
    faqs: [
      {
        q: "Do you integrate with QuickBooks?",
        a: "No. QuickBooks is listed as a complementary tool. Ground Stasis does not claim or require a QuickBooks integration.",
      },
    ],
    isPublished: true,
  },
  {
    slug: "project-management",
    name: "Project management",
    title: "Project Management & Construction Management Tools",
    metaDescription:
      "Work-management and construction-management platforms that complement construction loan monitoring. A curated category for lenders and the builders they fund.",
    h1: "Project & construction management",
    intro:
      "Work-management and construction-management platforms coordinate the people, tasks, and schedules on a project. They describe what's planned; Ground Stasis observes what's actually visible on the ground. For a lender, the two together are plan versus reality.",
    servedByGroundStasis: false,
    partners: [
      {
        id: "monday",
        name: "monday.com",
        description:
          "A flexible work-management platform used to coordinate projects and teams, with affiliate and partner programs.",
        bestFor: "Lenders and builders coordinating multi-party projects.",
        officialUrl: "https://monday.com/",
        affiliateUrl: null,
        ctaLabel: "Visit official website",
        relationshipType: "affiliate",
        programStatus: "researching",
        disclosureRequired: false,
      },
      {
        id: "buildertrend",
        name: "Buildertrend",
        description:
          "Residential construction-management software for builders and remodelers, with a published referral (Ambassadors) program.",
        bestFor: "Builders on financed residential projects.",
        officialUrl: "https://buildertrend.com/",
        affiliateUrl: null,
        ctaLabel: "Visit official website",
        relationshipType: "referral",
        programStatus: "researching",
        disclosureRequired: false,
      },
    ],
    faqs: [
      {
        q: "Does Ground Stasis pull data from these platforms?",
        a: "No. They're listed as complementary tools. Ground Stasis monitors a site from satellite imagery and does not depend on a project-management integration.",
      },
    ],
    isPublished: true,
  },
  {
    slug: "crm",
    name: "CRM",
    title: "CRM Software for Construction Lenders",
    metaDescription:
      "Customer-relationship and lead-management tools that fit a lending operation. A curated category in the construction lender stack.",
    h1: "CRM for lenders",
    intro:
      "A CRM keeps borrower relationships, pipeline, and follow-ups in one place. It's the relationship layer of the stack. Where it meets monitoring: a status change on a financed site is exactly the kind of event worth logging against a borrower record — which is why Ground Stasis connects to tools like these through Zapier.",
    servedByGroundStasis: false,
    partners: [
      {
        id: "hubspot",
        name: "HubSpot",
        description:
          "A widely used CRM and lead-workflow platform with a dedicated affiliate program (distinct from its Solutions Partner / agency program).",
        bestFor: "Lenders managing borrower pipeline and follow-ups.",
        officialUrl: "https://www.hubspot.com/",
        affiliateUrl: null,
        ctaLabel: "Visit official website",
        relationshipType: "affiliate",
        programStatus: "researching",
        disclosureRequired: false,
      },
    ],
    faqs: [
      {
        q: "Can Ground Stasis send alerts into my CRM?",
        a: "Yes — via Zapier. A Ground Stasis status change or alert can flow into a CRM or other tools through our Zapier integration. See /integrations/zapier.",
      },
    ],
    isPublished: true,
  },
];

export function getCategory(slug: string): StackCategory | undefined {
  return STACK_CATEGORIES.find((c) => c.slug === slug && c.isPublished);
}

export function publishedCategories(): StackCategory[] {
  return STACK_CATEGORIES.filter((c) => c.isPublished);
}

/** True if any published, monetized link exists (controls whether a disclosure shows). */
export function categoryHasMonetizedLinks(c: StackCategory): boolean {
  return c.partners.some((p) => p.disclosureRequired && (p.affiliateUrl || p.officialUrl));
}
