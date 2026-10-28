import { describe, it, expect } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  looksLikeApiKey,
  parseApiKey,
  hasScope,
  isApiScope,
  API_SCOPES,
} from "./keys";

describe("generateApiKey", () => {
  it("produces a gs_live_ key whose hash matches and whose prefix is a prefix", () => {
    const k = generateApiKey();
    expect(k.plaintext.startsWith("gs_live_")).toBe(true);
    expect(k.plaintext.length).toBeGreaterThan(40);
    expect(k.hashedKey).toBe(hashApiKey(k.plaintext));
    expect(k.hashedKey).toMatch(/^[0-9a-f]{64}$/);
    expect(k.plaintext.startsWith(k.prefix)).toBe(true);
    expect(k.prefix.length).toBe("gs_live_".length + 8);
  });

  it("is unique across generations and never stores the plaintext as the hash", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.hashedKey).not.toBe(b.hashedKey);
    expect(a.hashedKey).not.toBe(a.plaintext);
  });
});

describe("hashApiKey", () => {
  it("is deterministic and collision-distinct", () => {
    expect(hashApiKey("gs_live_abc")).toBe(hashApiKey("gs_live_abc"));
    expect(hashApiKey("gs_live_abc")).not.toBe(hashApiKey("gs_live_abd"));
  });
});

describe("parseApiKey / looksLikeApiKey", () => {
  it("accepts bearer and raw forms, rejects junk", () => {
    const k = generateApiKey().plaintext;
    expect(parseApiKey(`Bearer ${k}`)).toBe(k);
    expect(parseApiKey(k)).toBe(k);
    expect(parseApiKey("Bearer not-a-key")).toBeNull();
    expect(parseApiKey("")).toBeNull();
    expect(parseApiKey(null)).toBeNull();
    expect(parseApiKey(undefined)).toBeNull();
  });
  it("looksLikeApiKey requires the prefix and sufficient length", () => {
    expect(looksLikeApiKey("gs_live_shortish_but_long_enough_xxx")).toBe(true);
    expect(looksLikeApiKey("gs_live_x")).toBe(false);
    expect(looksLikeApiKey("nope")).toBe(false);
  });
});

describe("scopes", () => {
  it("validates and checks scopes", () => {
    expect(isApiScope("sites:read")).toBe(true);
    expect(isApiScope("bogus")).toBe(false);
    expect(hasScope(["sites:read", "usage:read"], "sites:read")).toBe(true);
    expect(hasScope(["sites:read"], "checks:write")).toBe(false);
    expect(API_SCOPES).toContain("webhooks:manage");
  });
});
