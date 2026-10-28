import { describe, it, expect } from "vitest";
import { backoffMs, decideOutcome, MAX_ATTEMPTS } from "./delivery-policy";

describe("delivery policy", () => {
  it("backoff grows exponentially and caps at 6h", () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(3)).toBe(120_000);
    expect(backoffMs(99)).toBe(6 * 60 * 60_000); // capped
  });

  it("delivered on success", () => {
    expect(decideOutcome(true, 1)).toEqual({ kind: "delivered" });
  });

  it("retries while under the attempt ceiling", () => {
    const o = decideOutcome(false, 2);
    expect(o.kind).toBe("retry");
    if (o.kind === "retry") expect(o.nextAttemptMs).toBe(60_000);
  });

  it("fails once attempts reach the ceiling", () => {
    expect(decideOutcome(false, MAX_ATTEMPTS)).toEqual({ kind: "failed" });
  });
});
