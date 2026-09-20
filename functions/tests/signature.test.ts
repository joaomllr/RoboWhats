import { describe, it, expect } from "vitest";
import * as crypto from "crypto";
import { validateMetaSignature } from "../../supabase/functions/_shared/signature.ts";

/**
 * Testa a implementação REAL deployada (supabase/functions/_shared/signature.ts),
 * não uma cópia. A versão anterior deste arquivo testava functions/src/webhook/signature.ts
 * — uma implementação Firebase-era abandonada, com assinatura síncrona e API
 * diferente da que roda em produção — e nunca teria detectado uma regressão real.
 */
function signBody(body: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

describe("validateMetaSignature (implementação real, _shared/signature.ts)", () => {
  const appSecret = "test-app-secret";
  const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });

  it("aceita uma assinatura HMAC SHA-256 válida", async () => {
    const validSignature = signBody(body, appSecret);
    const result = await validateMetaSignature(body, validSignature, appSecret);
    expect(result).toBe(true);
  });

  it("rejeita uma assinatura com hash incorreto", async () => {
    const wrongSignature = signBody(body, "outro-secret-qualquer");
    const result = await validateMetaSignature(body, wrongSignature, appSecret);
    expect(result).toBe(false);
  });

  it("rejeita quando o corpo foi alterado após a assinatura ser gerada", async () => {
    const signature = signBody(body, appSecret);
    const tamperedBody = body.replace("whatsapp_business_account", "outra_conta");
    const result = await validateMetaSignature(tamperedBody, signature, appSecret);
    expect(result).toBe(false);
  });

  it("rejeita quando o header não tem o prefixo sha256=", async () => {
    const hmac = crypto.createHmac("sha256", appSecret).update(body).digest("hex");
    const result = await validateMetaSignature(body, hmac, appSecret);
    expect(result).toBe(false);
  });

  it("rejeita quando o header de assinatura está ausente", async () => {
    const result = await validateMetaSignature(body, undefined, appSecret);
    expect(result).toBe(false);
  });

  it("rejeita quando o header de assinatura é null", async () => {
    const result = await validateMetaSignature(body, null, appSecret);
    expect(result).toBe(false);
  });

  it("rejeita quando o app secret está vazio", async () => {
    const validSignature = signBody(body, appSecret);
    const result = await validateMetaSignature(body, validSignature, "");
    expect(result).toBe(false);
  });

  it("é case-insensitive para o hash hexadecimal (maiúsculas)", async () => {
    const hmac = crypto.createHmac("sha256", appSecret).update(body).digest("hex");
    const uppercaseSignature = `sha256=${hmac.toUpperCase()}`;
    const result = await validateMetaSignature(body, uppercaseSignature, appSecret);
    expect(result).toBe(true);
  });

  it("rejeita um hash de comprimento incorreto (não 64 hex chars)", async () => {
    const result = await validateMetaSignature(body, "sha256=abcd1234", appSecret);
    expect(result).toBe(false);
  });

  it("aceita um corpo em Uint8Array (formato usado pelo webhook real)", async () => {
    const bodyBytes = new TextEncoder().encode(body);
    const validSignature = signBody(body, appSecret);
    const result = await validateMetaSignature(bodyBytes, validSignature, appSecret);
    expect(result).toBe(true);
  });
});
