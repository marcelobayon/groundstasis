import type { ApiScope } from "./keys";

// Maps a COMPLETED PURCHASE to the API scopes an auto-issued key receives.
//
// Scope (authorization) is kept deliberately separate from entitlement (the
// commercial right to spend). A key may hold `checks:write`, but whether a check
// actually runs is decided later by the entitlement layer (credits / seats /
// subscription state), never by the scope alone. So these scope sets are minimal
// and purchase-shaped; usage limits live elsewhere.
//
// `financials:read` is NEVER auto-granted here — loan metadata is added to a key
// only by a human in the dashboard.

export type PurchaseKind = "check_one_time" | "subscription";

const SCOPES: Record<PurchaseKind, readonly ApiScope[]> = {
  // $9 one-time: read the purchased report and its observations. No write, no
  // monitoring — the entitlement is that single check, nothing recurring.
  check_one_time: ["sites:read"],
  // $19/$49/$99 monitoring: register and manage sites (seat-limited by the
  // entitlement layer), read intelligence, read usage. Site COUNT is entitlement,
  // not scope. CDI is an entitlement add-on and grants no extra scope.
  subscription: ["sites:read", "sites:write", "usage:read"],
};

export function scopesForPurchase(kind: PurchaseKind): ApiScope[] {
  const scopes = [...SCOPES[kind]];
  // Defence in depth: financials:read is never auto-issued, whatever the table says.
  return scopes.filter((s) => s !== "financials:read");
}
