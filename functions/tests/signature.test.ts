import { describe, it, expect } from "vitest";
import * as crypto from "crypto";
import { validateMetaSignature } from "../src/webhook/signature";

describe("Meta Webhook Signature Verification (HMAC SHA-256)", () => {
  const secret = "test_meta_app_secret_123456";
  const payload = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "123", changes: [] }],
  });

  function generateValidSignature(body: string, appSecret: string): string {
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(body);
    return `sha256=${hmac.digest("hex")}`;
  }

  it("should validate a valid payload with matching HMAC signature", () => {
    const validSignature = generateValidSignature(payload, secret);
    const result = validateMetaSignature(payload, validSignature, secret);
    expect(result).toBe(true);
  });

  it("should reject when signature header is missing or null", () => {
    expect(validateMetaSignature(payload, undefined, secret)).toBe(false);
    expect(validateMetaSignature(payload, null, secret)).toBe(false);
    expect(validateMetaSignature(payload, "", secret)).toBe(false);
  });

  it("should reject when app secret is empty", () => {
    const validSignature = generateValidSignature(payload, secret);
    expect(validateMetaSignature(payload, validSignature, "")).toBe(false);
  });

  it("should reject when signature does not start with sha256=", () => {
    const validSignature = generateValidSignature(payload, secret);
    const malformed = validSignature.replace("sha256=", "md5=");
    expect(validateMetaSignature(payload, malformed, secret)).toBe(false);
  });

  it("should reject a tampered payload with an original signature", () => {
    const validSignature = generateValidSignature(payload, secret);
    const tamperedPayload = payload + " ";
    const result = validateMetaSignature(tamperedPayload, validSignature, secret);
    expect(result).toBe(false);
  });

  it("should reject a signature generated with the wrong secret", () => {
    const wrongSignature = generateValidSignature(payload, "wrong_secret");
    const result = validateMetaSignature(payload, wrongSignature, secret);
    expect(result).toBe(false);
  });

  it("should handle buffer inputs correctly", () => {
    const buffer = Buffer.from(payload, "utf-8");
    const validSignature = generateValidSignature(payload, secret);
    const result = validateMetaSignature(buffer, validSignature, secret);
    expect(result).toBe(true);
  });
});
