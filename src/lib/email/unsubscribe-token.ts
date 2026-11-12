import { createHmac, timingSafeEqual } from "node:crypto";

// Unsubscribe links must keep working long after an email is sent (CAN-SPAM
// requires opt-out to function for at least 30 days; we keep it indefinite), so
// unlike the magic-link token this payload has NO expiry. It is signed with the
// same MAGIC_LINK_SECRET (+ rotation) so no new secret is required, but the HMAC
// is domain-separated with an "unsub:" prefix so an unsubscribe token can never
// be replayed as a login token, or vice-versa.

const DOMAIN = "unsub:";

interface UnsubPayload {
  /** email address being unsubscribed */
  e: string;
  /** payload version */
  v: 1;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return Buffer.from(t, "base64");
}

function sign(body: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(DOMAIN + body).digest());
}

export function createUnsubscribeToken(email: string, secret: string): string {
  if (!secret) throw new Error("createUnsubscribeToken: secret is required");
  const normalized = email.trim().toLowerCase();
  const payload: UnsubPayload = { e: normalized, v: 1 };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body, secret)}`;
}

export type UnsubscribeVerifyResult =
  | { valid: true; email: string }
  | { valid: false; reason: string };

export function verifyUnsubscribeToken(
  token: string,
  secrets: string | Array<string | undefined>,
): UnsubscribeVerifyResult {
  const list = (Array.isArray(secrets) ? secrets : [secrets]).filter(
    (s): s is string => Boolean(s),
  );
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
    const expected = b64urlDecode(sign(body, secret));
    return expected.length === sigBuf.length && timingSafeEqual(expected, sigBuf);
  });
  if (!matches) return { valid: false, reason: "bad signature" };

  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as UnsubPayload;
    if (!payload.e || typeof payload.e !== "string") {
      return { valid: false, reason: "no email in token" };
    }
    return { valid: true, email: payload.e.trim().toLowerCase() };
  } catch {
    return { valid: false, reason: "malformed payload" };
  }
}
