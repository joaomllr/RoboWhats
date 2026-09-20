export interface SendWhatsAppOptions {
  phoneNumberId: string;
  to: string; // E.164 phone
  text: string;
  lastContactTimestampMs?: number;
  accessToken?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId: string;
  isInside24hWindow: boolean;
  category: "free_window" | "template_paid";
}

/**
 * Sends a message through official Meta WhatsApp Cloud API.
 * Ensures strict tracking of 24h customer care window ($0 Meta cost).
 */
export async function sendWhatsAppMessage(
  options: SendWhatsAppOptions
): Promise<SendWhatsAppResult> {
  const {
    phoneNumberId,
    to,
    text,
    lastContactTimestampMs,
    accessToken = Deno.env.get("META_ACCESS_TOKEN"),
  } = options;

  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const isInside24hWindow =
    lastContactTimestampMs !== undefined ? now - lastContactTimestampMs <= twentyFourHoursMs : true;

  const category = isInside24hWindow ? "free_window" : "template_paid";

  // Mock mode for local tests / pending Meta credentials (Bloqueio A)
  if (!accessToken || accessToken === "mock-token") {
    return {
      success: true,
      messageId: `wamid.mock_${Date.now()}`,
      isInside24hWindow,
      category,
    };
  }

  // Usamos v26.0 (a mesma versão testada manualmente com sucesso no Graph API
  // Explorer) em vez de v21.0. Para números de teste (sandbox), versões antigas
  // da Graph API podem retornar erro (#131030) "Recipient phone number not in
  // allowed list" mesmo com o destinatário corretamente cadastrado — o mesmo
  // payload em v26.0 funciona normalmente.
  const url = `https://graph.facebook.com/v26.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: text },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Meta Cloud API error [${response.status}]: ${err}`);
  }

  const data = await response.json();
  const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`;

  return {
    success: true,
    messageId,
    isInside24hWindow,
    category,
  };
}
