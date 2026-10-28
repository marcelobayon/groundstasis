import { createHmac, timingSafeEqual } from "node:crypto";

// Stripe-style webhook signatures. The signed string is `${timestamp}.${body}`;
// the header is `t=<unix>,v1=<hex hmac-sha256>`. Consumers recompute and compare
// in constant time, and reject stale timestamps to blunt replay. PURE
// (node:crypto only) so it is unit-tested in isolation.

export function signaturePayload(timestamp: number, body: string): string {
  return `${timestamp}.${body}`;
}

export function computeSignature(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(signaturePayload(timestamp, body)).digest("hex");
}

export function buildSignatureHeader(secret: string, body: string, nowMs: number = Date.now()): string {
  const t = Math.floor(nowMs / 1000);
  return `t=${t},v1=${computeSignature(secret, t, body)}`;
}

export interface ParsedSignature {
  t: number;
  v1: string;
}

export function parseSignatureHeader(header: string): ParsedSignature | null {
  let t: number | null = null;
  let v1: string | null = null;
  for (const part of header.split(",")) {
    const [k, v] = part.trim().split("=");
    if (k === "t") {
      const n = Number(v);
      if (Number.isFinite(n)) t = n;
    } else if (k === "v1" && v) {
      v1 = v;
    }
  }
  return t != null && v1 ? { t, v1 } : null;
}

export function verifySignature(
  secret: string,
  header: string,
  body: string,
  opts: { toleranceSeconds?: number; nowMs?: number } = {},
): { valid: boolean; reason?: string } {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { valid: false, reason: "malformed signature header" };

  const tolerance = opts.toleranceSeconds ?? 300;
  const now = Math.floor((opts.nowMs ?? Date.now()) / 1000);
  if (Math.abs(now - parsed.t) > tolerance) return { valid: false, reason: "timestamp outside tolerance" };

  const expected = Buffer.from(computeSignature(secret, parsed.t, body), "hex");
  const got = Buffer.from(parsed.v1, "hex");
  if (expected.length !== got.length || got.length === 0) return { valid: false, reason: "bad signature" };
  return timingSafeEqual(expected, got) ? { valid: true } : { valid: false, reason: "bad signature" };
}
