import { describe, it, expect } from "vitest";
import { createMagicLinkToken, verifyMagicLinkToken } from "./magic-link";

const SECRET = "test-secret-aaaaaaaaaaaaaaaaaaaaaaaa";
const PREVIOUS = "old-secret-bbbbbbbbbbbbbbbbbbbbbbbb";

describe("magic links", () => {
  it("creates a token that verifies", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const token = createMagicLinkToken("site-123", SECRET, { ttlMinutes: 30, scope: "site:read", now });
    const r = verifyMagicLinkToken(token, SECRET, now + 60_000);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.payload.sub).toBe("site-123");
      expect(r.payload.scope).toBe("site:read");
    }
  });

  it("rejects an expired token", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const token = createMagicLinkToken("site-123", SECRET, { ttlMinutes: 30, now });
    const r = verifyMagicLinkToken(token, SECRET, now + 31 * 60_000);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("expired");
  });

  it("rejects a tampered token", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const token = createMagicLinkToken("site-123", SECRET, { now });
    const [body, sig] = token.split(".");
    const tampered = `${body}x.${sig}`;
    expect(verifyMagicLinkToken(tampered, SECRET, now + 1000).valid).toBe(false);
  });

  it("supports secret rotation (verifies against the previous secret)", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const token = createMagicLinkToken("site-123", PREVIOUS, { now });
    // signed with the old secret; verify with [current, previous]
    expect(verifyMagicLinkToken(token, [SECRET, PREVIOUS], now + 1000).valid).toBe(true);
    // verifying with only the current secret fails
    expect(verifyMagicLinkToken(token, [SECRET], now + 1000).valid).toBe(false);
  });
});
