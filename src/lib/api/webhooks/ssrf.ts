import { isIP } from "node:net";

// SSRF guard for outbound webhook delivery.
//   Layer 1 (here): reject non-https, credentials-in-URL, non-443 ports, and
//     hostnames that are IP literals in private/reserved ranges or obvious
//     internal names.
//   Layer 2 (delivery worker, increment 4b): resolve the hostname and re-check
//     every resolved address with isBlockedIp before connecting — this is what
//     actually defeats DNS rebinding and public names pointing at private space.
// PURE (node:net only) so the classifier is unit-tested in isolation.

export function isBlockedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isBlockedIpv4(ip);
  if (v === 6) return isBlockedIpv6(ip.toLowerCase());
  return true; // not a valid IP literal → block (caller should pass a resolved IP)
}

function isBlockedIpv4(ip: string): boolean {
  const o = ip.split(".").map(Number);
  if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = o;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a >= 224) return true; // multicast (224/4) + reserved (240/4)
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  if (ip === "::1" || ip === "::") return true; // loopback / unspecified
  if (ip.startsWith("fe80")) return true; // link-local
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // unique local fc00::/7
  const mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

export type UrlValidation = { ok: true; url: URL } | { ok: false; reason: string };

export function validateWebhookUrl(raw: string): UrlValidation {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid URL" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "must be https" };
  if (url.username || url.password) return { ok: false, reason: "credentials in URL not allowed" };
  if (url.port && url.port !== "443") return { ok: false, reason: "only port 443 allowed" };

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return { ok: false, reason: "internal hostname not allowed" };
  }
  if (isIP(host) && isBlockedIp(host)) {
    return { ok: false, reason: "private or reserved IP not allowed" };
  }
  return { ok: true, url };
}
