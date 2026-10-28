import { describe, it, expect, beforeEach } from "vitest";
import { createMagicLinkToken } from "@/lib/auth/magic-link";
import { verifyAccountToken } from "./session";

// Security boundary: the account area must be reachable ONLY with an
// `account`-scoped token. Per-site tokens (site:read / site:workspace) grant a
// single site's workspace and must never unlock the account-wide portfolio or
// API-key management.
const SECRET = "account-test-secret-aaaaaaaaaaaaaaaaaaaa";

describe("verifyAccountToken", () => {
  beforeEach(() => {
    process.env.MAGIC_LINK_SECRET = SECRET;
    delete process.env.MAGIC_LINK_SECRET_PREVIOUS;
  });

  it("accepts a valid account-scoped token and returns the userId", () => {
    const token = createMagicLinkToken("user-1", SECRET, { scope: "account" });
    expect(verifyAccountToken(token)).toBe("user-1");
  });

  it("rejects per-site tokens (scope isolation)", () => {
    expect(verifyAccountToken(createMagicLinkToken("site-1", SECRET, { scope: "site:read" }))).toBeNull();
    expect(verifyAccountToken(createMagicLinkToken("site-1", SECRET, { scope: "site:workspace" }))).toBeNull();
    expect(verifyAccountToken(createMagicLinkToken("site-1", SECRET, { scope: "site:create" }))).toBeNull();
  });

  it("rejects a token with no scope", () => {
    expect(verifyAccountToken(createMagicLinkToken("user-1", SECRET))).toBeNull();
  });

  it("rejects an expired account token", () => {
    const token = createMagicLinkToken("user-1", SECRET, {
      scope: "account",
      ttlMinutes: 30,
      now: Date.now() - 60 * 60_000, // issued an hour ago, 30-min TTL
    });
    expect(verifyAccountToken(token)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createMagicLinkToken("user-1", "some-other-secret-bbbbbbbbbbbbbbbbbbbb", { scope: "account" });
    expect(verifyAccountToken(token)).toBeNull();
  });

  it("rejects empty / missing input", () => {
    expect(verifyAccountToken(undefined)).toBeNull();
    expect(verifyAccountToken(null)).toBeNull();
    expect(verifyAccountToken("")).toBeNull();
  });
});
