import { describe, it, expect } from "vitest";
import { computeSignature, buildSignatureHeader, parseSignatureHeader, verifySignature } from "./sign";

const SECRET = "whsec_test_aaaaaaaaaaaaaaaaaaaaaaaa";
const BODY = JSON.stringify({ id: "evt_1", event: "stasis.detected" });

describe("webhook signing", () => {
  it("computeSignature is deterministic and secret-dependent", () => {
    expect(computeSignature(SECRET, 1000, BODY)).toBe(computeSignature(SECRET, 1000, BODY));
    expect(computeSignature(SECRET, 1000, BODY)).not.toBe(computeSignature("other", 1000, BODY));
    expect(computeSignature(SECRET, 1000, BODY)).not.toBe(computeSignature(SECRET, 1001, BODY));
  });

  it("round-trips a header it built", () => {
    const now = 1_760_000_000_000; // fixed ms
    const header = buildSignatureHeader(SECRET, BODY, now);
    const parsed = parseSignatureHeader(header);
    expect(parsed?.t).toBe(Math.floor(now / 1000));
    expect(verifySignature(SECRET, header, BODY, { nowMs: now }).valid).toBe(true);
  });

  it("rejects wrong secret, tampered body, stale timestamp, malformed header", () => {
    const now = 1_760_000_000_000;
    const header = buildSignatureHeader(SECRET, BODY, now);
    expect(verifySignature("wrong", header, BODY, { nowMs: now }).valid).toBe(false);
    expect(verifySignature(SECRET, header, BODY + "x", { nowMs: now }).valid).toBe(false);
    // 10 minutes later, default tolerance 300s → stale
    expect(verifySignature(SECRET, header, BODY, { nowMs: now + 600_000 }).valid).toBe(false);
    expect(verifySignature(SECRET, "garbage", BODY, { nowMs: now }).valid).toBe(false);
    expect(verifySignature(SECRET, "t=abc,v1=zz", BODY, { nowMs: now }).valid).toBe(false);
  });
});
