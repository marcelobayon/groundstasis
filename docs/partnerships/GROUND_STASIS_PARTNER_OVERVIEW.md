# Ground Stasis — Partner Overview

_For partnership, referral, affiliate, and integration conversations. Last updated: 2026-10-28._

> This is an internal-facing brief you can paste from when applying to programs or
> introducing Ground Stasis to a prospective partner. Everything here is written to the
> brand's candor rules: a monitoring **signal**, never proof; no invented customers,
> integrations, or statistics. Keep it that way when you edit.

---

## Short description (reusable)

**One sentence.** Ground Stasis is an independent, satellite-derived monitoring signal that
helps construction lenders see when a financed site has gone unusually quiet between
inspections.

**Two–three sentences (for applications).** Ground Stasis monitors financed construction
sites using satellite-derived surface-change analysis and flags when observable activity
drops below a site's own baseline. It complements — it does not replace — physical
inspections, draw administration, appraisals, and lender underwriting. Lenders use it to
decide, between scheduled inspections, when a site deserves a closer look.

---

## Who it's for

Construction lenders, private and hard-money lenders, and capital providers who fund ground-up
or renovation projects in draws and currently have no independent read on a site between
inspections.

## The problem it addresses

Between draw inspections — often weeks apart — a lender has no independent way to tell whether
a financed site is progressing. A stall usually surfaces late: at the next inspection, or when
a draw request looks wrong. Ground Stasis turns that blind spot into a weekly signal.

## What it does — and does not — do

**Does:** requests cloud-masked, polygon-level satellite statistics for a site; compares
observable surface change against the site's own history; produces a status (Active / Watch /
Review / Stasis / Data gap), a 0–100 stasis score, and a confidence rating; emails alerts and a
weekly portfolio digest; exposes the data through a read API and webhooks.

**Does not:** replace physical inspection, appraisal, engineering review, or underwriting
judgment; verify completed work, work quality, code compliance, draw eligibility, or invoices;
conclude that construction has "stopped," been abandoned, or involves fraud. Missing or cloudy
imagery is reported as a **data gap**, never as inactivity.

---

## Current capabilities (verified in production, 2026-10-28)

These are live and confirmed from the codebase and the deployed site — safe to reference.

- **Satellite monitoring:** Copernicus Sentinel-2 L2A via the CDSE Sentinel Hub Statistical API
  (server-side polygon statistics; no raster downloads).
- **One-time site check ($9):** a single live read on one site, delivered as a secure link.
- **Recurring monitoring:** $19/mo (1 site), $49/mo (3 sites), $99/mo (10 sites).
- **Construction Draw Intelligence (CDI):** +$15/site/mo add-on comparing a reported
  construction milestone against the satellite evidence.
- **Read API (v1):** sites, observation history, check results, and usage — API-key auth with
  scopes and rate limiting; `?loan_number=` lookup for CRM use. OpenAPI at
  `https://groundstasis.com/api/v1/openapi.json`.
- **Outbound webhooks:** signed, with a durable retry outbox; drives a Zapier integration (REST
  Hooks).
- **Weekly portfolio digest:** a Monday email rollup of a lender's monitored sites.

> **Not yet built (do not present as live):** native Salesforce / Teams apps; any direct data
> integration with a partner (ATTOM, Procore, Land Gorilla, etc.). These are exploratory.

---

## How a partner's audience benefits

A partner serving lenders, builders, or construction projects shares Ground Stasis's audience
but solves a different problem. Ground Stasis adds an independent, between-inspection activity
signal that most of these tools don't provide, without competing with inspection, servicing,
project-management, accounting, CRM, or property-data products — it sits alongside them.

## Arrangements we're open to (in order of effort)

1. **Affiliate / referral** — a trackable link or referral agreement; lowest effort; the
   starting point for most partners.
2. **Co-marketing** — complementary resources, cross-links, shared content.
3. **Integration** — a workflow connection via the partner's API or ours, pursued only after a
   confirmed customer need and partner interest.
4. **Distribution** — surfacing a partner's data inside Ground Stasis, or ours inside theirs,
   under a commercial agreement. Highest effort; selective.

**Editorial-independence principle (non-negotiable):** a partner's commission or relationship
never influences a site's reported status, score, confidence, or interpretation. The directory
and the monitoring engine stay separate. This is the trust the product depends on.
