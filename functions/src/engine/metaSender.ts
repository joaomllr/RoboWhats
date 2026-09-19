export interface SendWhatsAppMessageOptions {
  phoneNumberId: string;
  to: string; // Recipient phone number (E.164)
  text?: string;
  templateName?: string;
  templateLanguage?: string;
  accessToken?: string;
  lastContactMessageTimestamp?: number; // epoch ms
}

export interface SendWhatsAppMessageResult {
  success: boolean;
  messageId: string;
  isInside24hWindow: boolean;
  category: "free_window" | "template_utility" | "template_marketing";
}

/**
 * Dispatches a WhatsApp message via Meta Cloud API.
 * Respects the 24-hour customer care window for $0 billing.
 */
export async function sendWhatsAppMessage(
  options: SendWhatsAppMessageOptions
): Promise<SendWhatsAppMessageResult> {
  const {
    phoneNumberId,
    to,
    text,
    templateName,
    templateLanguage = "pt_BR",
    accessToken = process.env.META_ACCESS_TOKEN,
    lastContactMessageTimestamp,
  } = options;

  // Check 24-hour customer care window
  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const isInside24hWindow =
    lastContactMessageTimestamp !== undefined
      ? now - lastContactMessageTimestamp <= twentyFourHoursMs
      : true;

  const category = isInside24hWindow
    ? "free_window"
    : templateName?.includes("promo")
    ? "template_marketing"
    : "template_utility";

  // Test / Mock mode
  if (!accessToken || accessToken === "mock-token" || process.env.NODE_ENV === "test") {
    return {
      success: true,
      messageId: `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      isInside24hWindow,
      category,
    };
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  let payload: Record<string, unknown>;

  if (isInside24hWindow && text) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    };
  } else if (templateName) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLanguage },
      },
    };
  } else {
    // Fallback inside 24h
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text || "Olá!" },
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Meta API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = (await response.json()) as { messages?: Array<{ id: string }> };
  const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`;

  return {
    success: true,
    messageId,
    isInside24hWindow,
    category,
  };
}
