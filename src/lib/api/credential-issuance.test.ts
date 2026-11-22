import { describe, it, expect } from "vitest";
import {
  generateClaimToken,
  hashClaimToken,
  looksLikeClaimToken,
  claimExpiry,
  isClaimExpired,
  CLAIM_TTL_MS,
} from "./claim-token";
import { scopesForPurchase } from "./issuance-scopes";

describe("claim token", () => {
  it("generates a prefixed, high-entropy token and stores only its hash", () => {
    const a = generateClaimToken();
    const b = generateClaimToken();
    expect(looksLikeClaimToken(a.token)).toBe(true);
    expect(a.token).not.toEqual(b.token); // unique
    expect(a.tokenHash).toEqual(hashClaimToken(a.token)); // hash is reproducible
    expect(a.tokenHash).not.toContain(a.token.slice(8)); // hash doesn't leak the secret
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/); // sha-256 hex
  });

  it("rejects malformed tokens", () => {
    expect(looksLikeClaimToken("nope")).toBe(false);
    expect(looksLikeClaimToken("gsclaim_short")).toBe(false);
  });

  it("expires 24h out and compares correctly", () => {
    expect(CLAIM_TTL_MS).toBe(24 * 60 * 60 * 1000);
    const start = new Date("2026-11-16T00:00:00Z");
    const exp = claimExpiry(start);
    expect(isClaimExpired(exp, new Date("2026-11-16T23:59:00Z"))).toBe(false);
    expect(isClaimExpired(exp, new Date("2026-11-17T00:01:00Z"))).toBe(true);
  });
});

describe("purchase → scope mapping", () => {
  it("one-time check gets read-only access to the purchased report", () => {
    expect(scopesForPurchase("check_one_time")).toEqual(["sites:read"]);
  });

  it("subscription gets read + site management + usage, but no write to checks by default", () => {
    const s = scopesForPurchase("subscription");
    expect(s).toContain("sites:read");
    expect(s).toContain("sites:write");
    expect(s).toContain("usage:read");
    expect(s).not.toContain("checks:write");
  });

  it("NEVER auto-grants financials:read", () => {
    expect(scopesForPurchase("check_one_time")).not.toContain("financials:read");
    expect(scopesForPurchase("subscription")).not.toContain("financials:read");
  });
});
