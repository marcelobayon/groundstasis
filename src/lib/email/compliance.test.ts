import { describe, it, expect, vi } from "vitest";

// Isolate from the Prisma client so these pure/crypto tests don't require a
// generated @prisma/client. isSuppressed with a null db returns false (safe
// default), which we also assert below.
vi.mock("@/lib/db/client", () => ({ getPrisma: () => null }));

import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./unsubscribe-token";
import {
  buildUnsubscribeUrl,
  renderComplianceFooterHtml,
  renderComplianceFooterText,
  getPostalAddress,
  isSuppressed,
} from "./compliance";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link";

const SECRET = "test-secret-aaaaaaaaaaaaaaaaaaaaaaaa";
const PREV = "old-secret-bbbbbbbbbbbbbbbbbbbbbbbb";

describe("unsubscribe token", () => {
  it("round-trips and normalizes the email", () => {
    const t = createUnsubscribeToken("Lender@Example.COM", SECRET);
    const r = verifyUnsubscribeToken(t, SECRET);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.email).toBe("lender@example.com");
  });

  it("rejects a tampered token", () => {
    const t = createUnsubscribeToken("a@b.com", SECRET);
    expect(verifyUnsubscribeToken(t + "x", SECRET).valid).toBe(false);
  });

  it("rejects the wrong secret but accepts a rotated (previous) secret", () => {
    const t = createUnsubscribeToken("a@b.com", PREV);
    expect(verifyUnsubscribeToken(t, SECRET).valid).toBe(false);
    expect(verifyUnsubscribeToken(t, [SECRET, PREV]).valid).toBe(true);
  });

  it("returns invalid when no secret is configured", () => {
    expect(verifyUnsubscribeToken("x.y", []).valid).toBe(false);
  });

  it("is domain-separated: an unsubscribe token is not a valid magic-link token", () => {
    const t = createUnsubscribeToken("a@b.com", SECRET);
    expect(verifyMagicLinkToken(t, SECRET).valid).toBe(false);
  });
});

describe("compliance footer", () => {
  it("builds an unsubscribe url pointing at the API route with an encoded token", () => {
    const url = buildUnsubscribeUrl("https://groundstasis.com/", "a@b.com", SECRET);
    expect(url).toContain("https://groundstasis.com/api/unsubscribe?token=");
    const token = decodeURIComponent(url.split("token=")[1]);
    expect(verifyUnsubscribeToken(token, SECRET).valid).toBe(true);
  });

  it("html footer includes the unsubscribe link and the postal address", () => {
    const html = renderComplianceFooterHtml("https://x/u?token=abc", "123 Main St, SLC, UT 84101");
    expect(html).toContain("https://x/u?token=abc");
    expect(html).toContain("123 Main St, SLC, UT 84101");
    expect(html.toLowerCase()).toContain("unsubscribe");
  });

  it("text footer includes the unsubscribe link and the postal address", () => {
    const text = renderComplianceFooterText("https://x/u?token=abc", "123 Main St");
    expect(text).toContain("https://x/u?token=abc");
    expect(text).toContain("123 Main St");
  });

  it("getPostalAddress reads and trims the env var", () => {
    expect(getPostalAddress({ COMPANY_POSTAL_ADDRESS: "  123 Main St  " } as NodeJS.ProcessEnv)).toBe(
      "123 Main St",
    );
    expect(getPostalAddress({} as NodeJS.ProcessEnv)).toBe("");
  });

  it("isSuppressed defaults to false when the database is unavailable", async () => {
    await expect(isSuppressed("a@b.com")).resolves.toBe(false);
  });
});
