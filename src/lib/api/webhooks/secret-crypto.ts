import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

// AES-256-GCM encryption of webhook signing secrets at rest. We sign outbound
// deliveries, so the plaintext must be recoverable — but a DB leak alone must
// not expose it. The key comes from WEBHOOK_ENC_KEY (SHA-256'd to exactly 32
// bytes so any sufficiently-random string works). Ciphertext format:
//   base64(iv) "." base64(authTag) "." base64(ciphertext)
// PURE (node:crypto only); the env key is passed in so this is unit-tested in
// isolation.

function keyFrom(raw: string): Buffer {
  return createHash("sha256").update(raw, "utf8").digest(); // 32 bytes
}

export function encryptSecret(plaintext: string, encKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(encKey), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decryptSecret(blob: string, encKey: string): string {
  const parts = blob.split(".");
  if (parts.length !== 3) throw new Error("malformed secret ciphertext");
  const [ivB, tagB, ctB] = parts;
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(encKey), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString("utf8");
}

// The secret a customer uses to verify our signatures. Shown once at creation.
export function generateWebhookSecret(): string {
  return "whsec_" + randomBytes(24).toString("base64url");
}
