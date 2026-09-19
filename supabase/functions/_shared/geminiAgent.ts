import { AIReasoningResult, LeadScore } from "./types.ts";
import { BotConfigData, defaultBotConfig } from "./stateMachine.ts";

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      return generateMockTurn(incomingMessage, contactName, currentStage);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(candidateText);

    const validScores: LeadScore[] = ["frio", "morno", "quente"];
    const leadScore: LeadScore = validScores.includes(parsed.leadScore) ? parsed.leadScore : "morno";

    return {
      replyText: parsed.replyText || "Olá! Como posso ajudar você hoje?",
      leadScore,
      scoreReason: parsed.scoreReason || "Interação em andamento",
      nextState: leadScore === "quente" ? "lead_quente" : currentStage,
      isEscalationRequested: false,
      tokenUsage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 220,
        candidateTokens: data.usageMetadata?.candidatesTokenCount || 75,
      },
    };
  } catch {
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
