import { AIReasoningResult, LeadScore } from "./types.ts";
import { BotConfigData, defaultBotConfig } from "./stateMachine.ts";

const GEMINI_MODEL = "gemini-3.6-flash";

/**
 * O modelo responde 503 ("experiencing high demand") de forma intermitente e o
 * webhook não tem como repetir o turno depois — o cliente já recebeu a resposta
 * enlatada. Uma segunda tentativa curta resolve o caso comum sem segurar o
 * webhook: a Meta espera resposta rápida, então não insistimos além disso.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status !== 503 && response.status !== 429) return response;

  console.warn(`Gemini indisponível [${response.status}], tentando novamente em 600ms.`);
  await new Promise((resolve) => setTimeout(resolve, 600));
  return fetch(url, init);
}

export interface GenerateTurnInput {
  incomingMessage: string;
  contactName?: string | null;
  currentStage: string;
  config?: BotConfigData;
  conversationHistory?: Array<{ direction: "inbound" | "outbound"; message_body: string }>;
  apiKey?: string;
}

/**
 * Runs a conversational turn using Google Gemini API (Google AI Studio key).
 * Calculates real-time lead score (frio / morno / quente) and crafts persona response.
 */
export async function runGeminiAgent(input: GenerateTurnInput): Promise<AIReasoningResult> {
  const {
    incomingMessage,
    contactName = "Cliente",
    currentStage,
    config = defaultBotConfig,
    conversationHistory = [],
    apiKey = Deno.env.get("GEMINI_API_KEY"),
  } = input;

  // Mock fallback if GEMINI_API_KEY is not yet supplied (Bloqueio B)
  if (!apiKey || apiKey === "mock-key") {
    return generateMockTurn(incomingMessage, contactName, currentStage);
  }

  try {
    const historyFormatted = conversationHistory
      .slice(-6)
      .map((m) => `${m.direction === "inbound" ? "Cliente" : "Assistente"}: ${m.message_body}`)
      .join("\n");

    const systemPrompt = `Você é ${config.botName}, assistente virtual de vendas e qualificação da empresa.
Descrição: ${config.companyDescription}
Pitch comercial: ${config.salesPitch}
Tom de voz: ${config.tone} (comunique-se em Português do Brasil com naturalidade, agilidade e mensagens concisas no padrão WhatsApp).
Base de conhecimento:
${config.knowledgeBase.map((k) => `- ${k}`).join("\n")}

Estágio atual do contato: "${currentStage}"

SEUS OBJETIVOS:
1. Responder à mensagem de forma acolhedora e orientada ao fechamento comercial.
2. Calcular o Lead Scoring em tempo real:
   - "frio": apenas saudação ou dúvidas sem intenção de contratação.
   - "morno": perguntas específicas sobre funcionamento, planos, integrações ou diferenciais.
   - "quente": perguntou sobre preços, pediu proposta, link de pagamento, demonstrou urgência ou interesse em contratar.
3. Fornecer uma justificativa resumida de 1 frase para o score.

FORMATO OBRIGATÓRIO (JSON estrito):
{
  "replyText": "Texto conciso da resposta",
  "leadScore": "frio" | "morno" | "quente",
  "scoreReason": "Justificativa breve do score"
}`;

    const promptText = `${systemPrompt}

Histórico recente:
${historyFormatted}

Mensagem atual do cliente (${contactName}): ${incomingMessage}`;

    // A partir de 2026 o Google emite chaves no novo formato "AQ." (Auth key), que substitui
    // as antigas "AIza..." (Standard key). Chaves "AQ." exigem o header x-goog-api-key — o
    // parâmetro de query ?key= (usado pelas chaves antigas) retorna 401
    // ACCESS_TOKEN_TYPE_UNSUPPORTED para esse formato. Enviamos sempre via header, que
    // funciona para os dois formatos de chave.
    //
    // Usamos a Interactions API (e não models/*:generateContent, hoje legado) porque
    // nos modelos Gemini 3 os tokens de raciocínio consomem o orçamento de saída: no
    // nível padrão o raciocínio ocupa quase tudo e o JSON volta truncado
    // ("Unterminated string in JSON"). Aumentar o teto não resolve de forma
    // confiável — o raciocínio tende a se expandir junto. Quem controla isso é
    // generation_config.thinking_level, que só existe aqui. O response_format com
    // schema ainda garante que a resposta venha no formato esperado.
    const res = await fetchWithRetry(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          input: promptText,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: {
              type: "object",
              properties: {
                replyText: { type: "string", description: "Resposta concisa ao cliente" },
                leadScore: { type: "string", enum: ["frio", "morno", "quente"] },
                scoreReason: { type: "string", description: "Justificativa breve do score" },
              },
              required: ["replyText", "leadScore", "scoreReason"],
            },
          },
          generation_config: {
            temperature: 0.3,
            thinking_level: "minimal",
          },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`Gemini API error [${res.status}]: ${errBody}`);
      return generateMockTurn(incomingMessage, contactName, currentStage);
    }

    const data = await res.json();
    const outputText = data.output_text ?? data.interaction?.output_text;

    if (typeof outputText !== "string") {
      console.error(
        `Gemini: resposta sem output_text. Chaves recebidas: ${JSON.stringify(Object.keys(data))}`
      );
      return generateMockTurn(incomingMessage, contactName, currentStage);
    }

    const parsed = JSON.parse(outputText);
    const usage = data.usage ?? data.interaction?.usage;

    const validScores: LeadScore[] = ["frio", "morno", "quente"];
    const leadScore: LeadScore = validScores.includes(parsed.leadScore) ? parsed.leadScore : "morno";

    return {
      replyText: parsed.replyText || "Olá! Como posso ajudar você hoje?",
      leadScore,
      scoreReason: parsed.scoreReason || "Interação em andamento",
      nextState: leadScore === "quente" ? "lead_quente" : currentStage,
      isEscalationRequested: false,
      tokenUsage: {
        promptTokens: usage?.input_tokens ?? usage?.prompt_tokens ?? 220,
        candidateTokens: usage?.output_tokens ?? usage?.completion_tokens ?? 75,
      },
    };
  } catch (err) {
    console.error("Gemini turn failed, usando fallback:", err);
    return generateMockTurn(incomingMessage, contactName, currentStage);
  }
}

function generateMockTurn(
  message: string,
  _contactName: string,
  currentStage: string
): AIReasoningResult {
  const lower = message.toLowerCase();
  let score: LeadScore = "morno";
  let reason = "Cliente demonstrou interesse em conhecer o produto";
  let reply = "Olá! Que ótimo falar com você. Nossos planos conectam seu WhatsApp com IA oficial em minutos. Gostaria de conhecer o plano ideal para seu negócio?";

  if (lower.includes("preço") || lower.includes("quanto custa") || lower.includes("comprar") || lower.includes("fechar") || lower.includes("proposta")) {
    score = "quente";
    reason = "Lead consultou valores e demonstrou prontidão para contratar 🔥";
    reply = "Nosso Plano Pro sai por R$ 497/mês com até 5.000 contatos ativos e IA ilimitada! Deseja iniciar seu teste com 7 dias de garantia agora mesmo?";
  } else if (lower.includes("oi") || lower.includes("olá") || lower.includes("ola") || lower.includes("boa tarde")) {
    score = "frio";
    reason = "Saudação inicial de topo de funil ❄️";
    reply = "Olá! Seja muito bem-vindo à nossa plataforma de vendas e atendimento no WhatsApp. Como posso ajudar você hoje?";
  }

  return {
    replyText: reply,
    leadScore: score,
    scoreReason: reason,
    nextState: score === "quente" ? "lead_quente" : currentStage,
    isEscalationRequested: false,
    tokenUsage: {
      promptTokens: 180,
      candidateTokens: 60,
    },
  };
}
