/**
 * Validates Meta WhatsApp Cloud API webhook signature (X-Hub-Signature-256).
 * Uses standard Web Crypto API for constant-time HMAC SHA-256 verification in Deno / Edge Runtime.
 */
export async function validateMetaSignature(
  rawBody: Uint8Array | string,
  signatureHeader: string | undefined | null,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }

  const expectedHash = signatureHeader.slice(prefix.length).trim().toLowerCase();
  if (!expectedHash || expectedHash.length !== 64) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(appSecret);
    const bodyData = typeof rawBody === "string" ? encoder.encode(rawBody) : rawBody;

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, bodyData);
    const computedHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time string equality check to prevent timing attacks
    if (computedHash.length !== expectedHash.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < computedHash.length; i++) {
      mismatch |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}
