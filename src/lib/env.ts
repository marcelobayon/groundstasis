// Lightweight environment access + validation. No dependency on a schema lib.
// `requireEnv` throws only when a feature that needs a var is actually used, so
// the app still boots (in demo mode) with an empty environment.

export function getEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required environment variable: ${key}`);
  return v;
}

export function getMagicLinkSecrets(): string[] {
  return [process.env.MAGIC_LINK_SECRET, process.env.MAGIC_LINK_SECRET_PREVIOUS].filter(
    (s): s is string => Boolean(s)
  );
}

export function getMagicLinkTtlMinutes(): number {
  const n = Number(process.env.MAGIC_LINK_TTL_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

export function isAdmin(secretFromRequest: string | null | undefined): boolean {
  const configured = process.env.ADMIN_SECRET;
  if (!configured) return false; // admin disabled unless explicitly configured
  if (!secretFromRequest) return false;
  // constant-time-ish compare
  if (secretFromRequest.length !== configured.length) return false;
  let diff = 0;
  for (let i = 0; i < configured.length; i++) {
    diff |= configured.charCodeAt(i) ^ secretFromRequest.charCodeAt(i);
  }
  return diff === 0;
}

/** Encryption key for webhook signing secrets at rest (AES-256-GCM). */
export function getWebhookEncKey(): string | null {
  return process.env.WEBHOOK_ENC_KEY ?? null;
}

/** A quick capability report for the admin/debug view. */
export function capabilities() {
  return {
    database: Boolean(process.env.DATABASE_URL),
    satelliteProvider: process.env.SATELLITE_PROVIDER ?? "demo",
    satelliteConfigured: Boolean(
      process.env.SENTINELHUB_CLIENT_ID && process.env.SENTINELHUB_CLIENT_SECRET
    ),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    emailProvider: process.env.EMAIL_PROVIDER ?? "console",
    magicLink: Boolean(process.env.MAGIC_LINK_SECRET),
    webhooks: Boolean(process.env.WEBHOOK_ENC_KEY),
  };
}
