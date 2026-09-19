import * as crypto from "crypto";

/**
 * Validates Meta WhatsApp Cloud API webhook signature (X-Hub-Signature-256).
 *
 * @param rawBody - Raw Buffer or string of the incoming request body
 * @param signatureHeader - The 'x-hub-signature-256' HTTP header
 * @param appSecret - Meta App Secret
 * @returns boolean - true if signature matches, false otherwise
 */
export function validateMetaSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  // Meta signature format: "sha256=<hex_digest>"
  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }

  const expectedHash = signatureHeader.slice(prefix.length).trim();
  if (!expectedHash || expectedHash.length !== 64) {
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(rawBody);
    const computedHash = hmac.digest("hex");

    const expectedBuffer = Buffer.from(expectedHash, "hex");
    const computedBuffer = Buffer.from(computedHash, "hex");

    if (expectedBuffer.length !== computedBuffer.length) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
  } catch (error) {
    return false;
  }
}
