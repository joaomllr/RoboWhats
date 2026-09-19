import { GoogleGenAI } from "@google/genai";
import { BotConfig, ContactRecord, AIReasoningResult, LeadScore } from "../types";

export interface GenerateBotTurnInput {
  incomingMessage: string;
  contact: ContactRecord;
  config: BotConfig;
  conversationHistory: Array<{ sender: string; text: string }>;
  apiKey?: string;
}

/**
 * Gemini-powered reasoning engine for WhatsApp Sales Hub.
 * Produces persona-driven responses, evaluates lead scoring in real-time,
 * extracts lead attributes, and suggests state machine transitions.
 */
export async function runGeminiAgentTurn(input: GenerateBotTurnInput): Promise<AIReasoningResult> {
  const { incomingMessage, contact, config, conversationHistory, apiKey } = input;
  const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;

  // Fallback / Mock mode for unit tests and local environments without active API keys
  if (!effectiveApiKey || effectiveApiKey === "mock-key" || process.env.NODE_ENV === "test") {
    return generateMockTurn(incomingMessage, contact, config);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    const persona = config.persona || {
      botName: "Assistente",
      tone: "professional",
      companyDescription: "Empresa",
      salesPitch: "Ajudamos você a crescer.",
      knowledgeBase: [],
    };

    const currentState = contact.currentState || config.stateMachine?.initialState || "welcome";
    const availableStates = Object.keys(config.stateMachine?.states || {});

    const historyFormatted = conversationHistory
      .slice(-6)
      .map((m) => `${m.sender === "contact" ? "Cliente" : "Assistente"}: ${m.text}`)
      .join("\n");

    const systemPrompt = `Você é ${persona.botName}, assistente virtual e especialista em vendas da empresa.
Descrição da empresa: ${persona.companyDescription}
Proposta de valor e discurso de vendas: ${persona.salesPitch}
Tom de voz obrigatório: ${persona.tone} (comunique-se em Português do Brasil de forma natural, ágil e concisa, ideal para WhatsApp).
Base de conhecimento relevante:
${persona.knowledgeBase.map((kb) => `- ${kb}`).join("\n")}

ESTADO ATUAL DO FLUXO: "${currentState}"
Estados disponíveis no fluxo: ${availableStates.join(", ")}

SEU OBJETIVO:
1. Responder à mensagem do cliente de forma útil e orientada à conversão comercial, sem respostas longas ou cansativas.
2. Avaliar o Lead Scoring com base no interesse demonstrado:
   - "frio": curioso sem urgência, apenas saudação ou dúvidas desconexas.
   - "morno": tem interesse real, pede informações específicas sobre produtos, serviços ou preços.
   - "quente": tem alta intenção de compra, pede proposta, reunião, link de pagamento ou demonstra urgência.
3. Decidir o próximo estado do fluxo ("nextState") entre os estados disponíveis.
4. Extrair dados úteis do cliente se mencionados (nome, empresa, orçamento, necessidade principal).

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON estrito):
{
  "replyText": "Texto da resposta para enviar no WhatsApp",
  "leadScore": "frio" | "morno" | "quente",
  "scoreReason": "Justificativa breve de 1 frase para o score",
  "nextState": "nome_do_proximo_estado",
  "extractedData": { "chave": "valor" }
}`;

    const userPrompt = `Histórico recente da conversa:
${historyFormatted}
Cliente: ${incomingMessage}

Responda em formato JSON estrito conforme as instruções.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      config: {
        maxOutputTokens: 500,
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "";
    const parsed = JSON.parse(responseText);

    return {
      replyText: parsed.replyText || "Olá! Como posso ajudar você hoje?",
      leadScore: (["frio", "morno", "quente"].includes(parsed.leadScore) ? parsed.leadScore : "morno") as LeadScore,
      scoreReason: parsed.scoreReason || "Interação em andamento",
      nextState: parsed.nextState || currentState,
      extractedData: parsed.extractedData || {},
      isEscalationRequested: false,
      tokenUsage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 250,
        candidateTokens: response.usageMetadata?.candidatesTokenCount || 80,
      },
    };
  } catch (error) {
    // Graceful fallback if AI call encounters rate limits or transient issues
    return generateMockTurn(incomingMessage, contact, config);
  }
}

function generateMockTurn(
  incomingMessage: string,
  contact: ContactRecord,
  config: BotConfig
): AIReasoningResult {
  const lower = incomingMessage.toLowerCase();
  let score: LeadScore = "morno";
  let reason = "Cliente solicitou informações gerais";
  let nextState = contact.currentState || config.stateMachine?.initialState || "welcome";

  if (lower.includes("preço") || lower.includes("quanto custa") || lower.includes("comprar") || lower.includes("fechar")) {
    score = "quente";
    reason = "Cliente consultou valores com interesse de contratação";
    nextState = "qualification";
  } else if (lower.includes("oi") || lower.includes("olá") || lower.includes("ola")) {
    score = "frio";
    reason = "Saudação inicial";
    nextState = "presentation";
  }

  const botName = config.persona?.botName || "Assistente";
  const reply = `Olá! Sou o ${botName}. Que ótimo falar com você! Como posso te ajudar a encontrar a solução perfeita hoje?`;

  return {
    replyText: reply,
    leadScore: score,
    scoreReason: reason,
    nextState,
    extractedData: {},
    isEscalationRequested: false,
    tokenUsage: {
      promptTokens: 180,
      candidateTokens: 45,
    },
  };
}
