# Partner Pipeline & Opportunity Matrix

_Prospective partners only — none approved. Program links verified 2026-10-28; re-verify before acting._

> **Ground rules.** Nothing here is an approved relationship. "Program exists" means I found an
> official program page on that date, not that Ground Stasis qualifies or has applied. Never
> present a prospective target as a partner. The affiliate directory stays **editorially
> independent** from the monitoring engine: a commission never affects a site's reported status,
> score, confidence, or interpretation.

## How to read this

- **Relationship:** `affiliate` · `referral` · `integration` · `distribution` · `co-marketing`.
- **Tier (effort):** T1 = apply to an existing affiliate/referral program · T2 = direct
  referral / co-marketing · T3 = integration / distribution (selective, demand-gated).
- **Fit / Complexity:** H / M / L.
- **Status:** `researching` → `applied` → `approved` / `rejected` / `not_available`.

---

## Opportunity matrix

| Partner | Category | Program verified (2026-10-28) | Relationship sought | Tier | Audience fit | Revenue model | Integration complexity | Next action | Status |
|---|---|---|---|---|---|---|---|---|---|
| **ATTOM** | Property data | Referral + Distribution partner pages ([referral](https://www.attomdata.com/partnerships/referral-partner/), [distribution](https://www.attomdata.com/partnerships/distribution-partner/)) | referral → distribution | T1 → T3 | H | referral fee; later data-distribution commercial | L now / H later | Apply to referral program | researching |
| **QuickBooks** | Accounting | [Business Affiliate Program](https://quickbooks.intuit.com/partners/qbbusinessaffiliates/) | affiliate | T1 | M | affiliate commission | L | Confirm US path; apply | researching |
| **monday.com** | Project mgmt | [Partner program](https://monday.com/partner-program-guide); affiliate via PartnerStack | affiliate / partner | T1 | M | affiliate commission | L | Pick affiliate vs partner; apply | researching |
| **Buildertrend** | Construction mgmt | [Ambassadors](https://buildertrend.com/ambassadors/) (referral) | referral | T1 | H | referral reward | L | Apply to Ambassadors | researching |
| **HubSpot** | CRM | [Affiliate](https://www.hubspot.com/partners/affiliates) (distinct from [Solutions Partner](https://www.hubspot.com/partners)) | affiliate | T1 | M | affiliate commission | L | Apply to affiliate (not agency) | researching |
| **Land Gorilla** | Loan servicing | Public [API](https://landgorilla.com/land-gorilla-api/); integration-oriented | referral → integration | T2 → T3 | H | co-marketing / integration | H | Email BD; discuss fit | researching |
| **Procore** | Project mgmt platform | [Developer partner path](https://developers.procore.com/partner) + App Marketplace | integration | T3 | M | marketplace / integration | H | Fit discussion only | researching |

Official homepages: [attomdata.com](https://www.attomdata.com/) · [quickbooks.intuit.com](https://quickbooks.intuit.com/) · [monday.com](https://monday.com/) · [buildertrend.com](https://buildertrend.com/) · [hubspot.com](https://www.hubspot.com/) · [landgorilla.com](https://landgorilla.com/) · [procore.com](https://www.procore.com/)

---

## By tier (recommended sequence)

**Tier 1 — apply to existing programs (do these first).** ATTOM (referral), Buildertrend
(Ambassadors), monday.com, HubSpot (affiliate), QuickBooks. Lowest effort; the goal is approved,
trackable links on useful directory pages, then measure outbound clicks. These fund the directory
if traffic materializes.

**Tier 2 — direct referral / co-marketing.** Land Gorilla and inspection / servicing / compliance
vendors. The goal is a written referral arrangement, a trackable link, or a co-marketing
resource — not a software integration. Start by email, not by proposing a build.

**Tier 3 — integration / distribution (selective, demand-gated).** ATTOM distribution, Land
Gorilla integration, Procore App Marketplace. Do **not** offer to build before confirming the
partner wants it and customers need it. Validate the relationship by email first; only then
discuss API access, security review, maintenance, and commercial terms. An enterprise
integration is not an affiliate opportunity — it carries approval, security, adoption, and
support burden.

**Strategic note (holds across tiers):** affiliate revenue is downstream of traffic. Until the
SEO pages are demonstrably indexed and drawing lender traffic, treat this whole layer as
groundwork, not a revenue line. Prioritize a few high-fit programs over breadth.

---

## Ranking rationale (highest-fit first)

1. **ATTOM** — highest audience fit (lenders already consume property data), and the only target
   with both a referral and a distribution path, so it grows with you.
2. **Buildertrend** — strong fit (financed-project builders) and a clean published referral path.
3. **Land Gorilla** — the most natural *workflow* complement (draw administration), but Tier 2/3,
   so slower and relationship-led.
4. **monday.com / HubSpot / QuickBooks** — broad SaaS affiliates; easy to join, weaker intent
   match; worth it for directory completeness and low effort.
5. **Procore** — real technology-partner path but highest effort and demand-gated; a later bet.

---

## Adding an approved affiliate URL later (procedure)

When a program approves you:

1. Open the centralized partner config (to be created at `src/config/affiliates.ts` when the
   directory code is built — see the directory brief).
2. Find the partner's entry and set: `programStatus: "approved"`, `relationshipType` to the real
   type, and paste the **exact** approved `affiliateUrl` (with its real tracking parameters).
   Set `disclosureRequired: true` for any monetized link.
3. Leave `affiliateUrl` empty for anything not yet approved — the directory renders a labeled
   "Visit official website" CTA to the verified `officialUrl` instead, never a `#` or fake link.
4. Update `lastVerifiedAt` and this file's status column (→ `approved`, with the date).
5. Rebuild and confirm the link renders as an **affiliate** link (disclosed) and ordinary
   external links stay visually distinct from monetized ones.

Never label a link "affiliate" unless it is one. Never fabricate a tracking parameter.
