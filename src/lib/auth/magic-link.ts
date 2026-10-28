import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

// Passwordless auth: a short-lived, HMAC-signed token embedded in a link.
// No session passwords, no sensitive data in the token. Supports secret
// ROTATION: sign with the current secret, verify against current + previous.

export interface MagicLinkPayload {
  /** subject — typically a site id or user id */
  sub: string;
  /** scope, e.g. "site:read" */
  scope?: string;
  /** issued-at (epoch seconds) */
  iat: number;
  /** expiry (epoch seconds) */
  exp: number;
  /** random nonce — makes each token unique and supports revocation lists */
  nonce: string;
}

export interface SignOptions {
  ttlMinutes?: number;
  scope?: string;
  /** epoch ms; injectable for tests */
  now?: number;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return Buffer.from(t, "base64");
}

function signBody(body: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(body).digest());
}

export function createMagicLinkToken(sub: string, secret: string, opts: SignOptions = {}): string {
  if (!secret) throw new Error("createMagicLinkToken: secret is required");
  const nowMs = opts.now ?? Date.now();
  const iat = Math.floor(nowMs / 1000);
  const ttl = Math.max(1, opts.ttlMinutes ?? 30) * 60;
  const payload: MagicLinkPayload = {
    sub,
    scope: opts.scope,
    iat,
    exp: iat + ttl,
    nonce: b64url(randomBytes(9)),
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${signBody(body, secret)}`;
}

export type VerifyResult =
  | { valid: true; payload: MagicLinkPayload }
  | { valid: false; reason: string };

export function verifyMagicLinkToken(
  token: string,
  secrets: string | Array<string | undefined>,
  now: number = Date.now()
): VerifyResult {
  const list = (Array.isArray(secrets) ? secrets : [secrets]).filter((s): s is string => Boolean(s));
  if (list.length === 0) return { valid: false, reason: "no secret configured" };

  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed token" };
  const [body, sig] = parts;

  let sigBuf: Buffer;
  try {
    sigBuf = b64urlDecode(sig);
  } catch {
    return { valid: false, reason: "malformed signature" };
  }

  const matches = list.some((secret) => {
    const expected = b64urlDecode(signBody(body, secret));
    return expected.length === sigBuf.length && timingSafeEqual(expected, sigBuf);
  });
  if (!matches) return { valid: false, reason: "bad signature" };

  let payload: MagicLinkPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8")) as MagicLinkPayload;
  } catch {
    return { valid: false, reason: "bad payload" };
  }
  if (typeof payload.exp !== "number" || Math.floor(now / 1000) > payload.exp) {
    return { valid: false, reason: "expired" };
  }
  return { valid: true, payload };
}
