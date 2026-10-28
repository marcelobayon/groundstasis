import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "./stripe-provider";

const SECRET = "whsec_test_secret";

function sign(payload: string, secret: string, timestamp: number): string {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

describe("stripe webhook signature", () => {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const nowMs = Date.UTC(2026, 0, 1, 12, 0, 0);
  const ts = Math.floor(nowMs / 1000);

  it("accepts a correctly signed payload", () => {
    const header = sign(payload, SECRET, ts);
    expect(verifyStripeSignature(payload, header, SECRET, { nowMs }).valid).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const header = sign(payload, "whsec_wrong", ts);
    const r = verifyStripeSignature(payload, header, SECRET, { nowMs });
    expect(r.valid).toBe(false);
  });

  it("rejects a tampered payload", () => {
    const header = sign(payload, SECRET, ts);
    const r = verifyStripeSignature(payload + "x", header, SECRET, { nowMs });
    expect(r.valid).toBe(false);
  });

  it("rejects a timestamp outside tolerance", () => {
    const header = sign(payload, SECRET, ts - 10_000);
    const r = verifyStripeSignature(payload, header, SECRET, { nowMs, toleranceSec: 300 });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("timestamp outside tolerance");
  });

  it("rejects a malformed or missing header", () => {
    expect(verifyStripeSignature(payload, "garbage", SECRET, { nowMs }).valid).toBe(false);
    expect(verifyStripeSignature(payload, null, SECRET, { nowMs }).valid).toBe(false);
    expect(verifyStripeSignature(payload, sign(payload, SECRET, ts), "", { nowMs }).valid).toBe(false);
  });
});
