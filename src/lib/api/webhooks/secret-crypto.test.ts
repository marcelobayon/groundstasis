import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret, generateWebhookSecret } from "./secret-crypto";

const KEY = "test-webhook-enc-key-aaaaaaaaaaaaaaaa";

describe("webhook secret crypto (AES-256-GCM)", () => {
  it("round-trips a secret", () => {
    const secret = generateWebhookSecret();
    const blob = encryptSecret(secret, KEY);
    expect(blob).not.toContain(secret); // ciphertext doesn't leak plaintext
    expect(decryptSecret(blob, KEY)).toBe(secret);
  });

  it("produces a fresh IV each time (different ciphertext for same input)", () => {
    expect(encryptSecret("same", KEY)).not.toBe(encryptSecret("same", KEY));
  });

  it("fails to decrypt with the wrong key", () => {
    const blob = encryptSecret("sekret", KEY);
    expect(() => decryptSecret(blob, "different-key-bbbbbbbbbbbbbbbbbbbb")).toThrow();
  });

  it("fails to decrypt tampered ciphertext (auth tag)", () => {
    const [iv, tag, ct] = encryptSecret("sekret", KEY).split(".");
    const tampered = [iv, tag, Buffer.from("evil").toString("base64")].join(".");
    expect(() => decryptSecret(tampered, KEY)).toThrow();
  });

  it("generates whsec_-prefixed secrets", () => {
    expect(generateWebhookSecret()).toMatch(/^whsec_[A-Za-z0-9_-]{20,}$/);
  });
});
