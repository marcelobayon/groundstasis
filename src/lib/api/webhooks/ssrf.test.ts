import { describe, it, expect } from "vitest";
import { isBlockedIp, validateWebhookUrl } from "./ssrf";

describe("isBlockedIp", () => {
  it("blocks private / reserved / loopback / metadata", () => {
    for (const ip of ["10.0.0.1", "127.0.0.1", "192.168.1.1", "172.16.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fe80::1", "fd00::1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });
  it("allows normal public IPs", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "203.0.113.10", "2606:4700:4700::1111"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });
  it("blocks non-IP input", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});

describe("validateWebhookUrl", () => {
  it("accepts a normal https URL", () => {
    const r = validateWebhookUrl("https://hooks.example.com/ingest");
    expect(r.ok).toBe(true);
  });
  it("rejects http, credentials, bad ports", () => {
    expect(validateWebhookUrl("http://example.com/x").ok).toBe(false);
    expect(validateWebhookUrl("https://user:pass@example.com/x").ok).toBe(false);
    expect(validateWebhookUrl("https://example.com:8080/x").ok).toBe(false);
  });
  it("rejects internal names and private/loopback IP literals", () => {
    expect(validateWebhookUrl("https://localhost/x").ok).toBe(false);
    expect(validateWebhookUrl("https://foo.internal/x").ok).toBe(false);
    expect(validateWebhookUrl("https://127.0.0.1/x").ok).toBe(false);
    expect(validateWebhookUrl("https://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(validateWebhookUrl("https://[::1]/x").ok).toBe(false);
  });
});
