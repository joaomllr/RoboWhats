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

const GRAPH_API_VERSION = "v26.0";
const BRAZIL_COUNTRY_CODE = "55";
const ERROR_RECIPIENT_NOT_ALLOWED = 131030;

/**
 * A Meta entrega `from`/`wa_id` de celulares brasileiros no formato legado de
 * 12 dígitos (55 + DDD + 8 dígitos, sem o 9º dígito), mas a allowed list de
 * números de teste guarda o número exatamente como foi cadastrado no painel —
 * com o 9. Esse gate é match exato, então enviar a forma de 12 dígitos falha
 * com (#131030) mesmo com o destinatário verificado. Tentamos primeiro a forma
 * com o 9 (aceita tanto pela sandbox quanto por números de produção) e caímos
 * para a forma legada se a Meta recusar.
 */
export function brazilianPhoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
  if (!digits.startsWith(BRAZIL_COUNTRY_CODE)) return [digits];

  const ddd = digits.slice(2, 4);
  const subscriber = digits.slice(4);

  if (subscriber.length === 8 && /^[6-9]/.test(subscriber)) {
    return [`${BRAZIL_COUNTRY_CODE}${ddd}9${subscriber}`, digits];
  }
  if (subscriber.length === 9 && subscriber.startsWith("9")) {
    return [digits, `${BRAZIL_COUNTRY_CODE}${ddd}${subscriber.slice(1)}`];
  }
  return [digits];
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

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const candidates = brazilianPhoneVariants(to);
  let lastError = "";

  for (const candidate of candidates) {
    const body = JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: candidate,
      type: "text",
      text: { preview_url: false, body: text },
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        messageId: data.messages?.[0]?.id || `wamid.${Date.now()}`,
        isInside24hWindow,
        category,
      };
    }

    lastError = await response.text();
    let code: number | undefined;
    let fbtraceId: string | undefined;
    try {
      const parsed = JSON.parse(lastError);
      code = parsed?.error?.code;
      fbtraceId = parsed?.error?.fbtrace_id;
    } catch {
      // resposta não-JSON: mantém lastError cru
    }

    console.warn(
      `Meta send failed — to: ${candidate}, status: ${response.status}, code: ${code}, fbtrace_id: ${fbtraceId}`
    );

    if (code !== ERROR_RECIPIENT_NOT_ALLOWED) break;
  }

  throw new Error(`Meta Cloud API error: ${lastError}`);
}
