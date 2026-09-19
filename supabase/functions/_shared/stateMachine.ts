import { ContactRecord } from "./types.ts";

export interface BotStateDefinition {
  name: string;
  description: string;
  systemPromptInstructions: string;
  nextPossibleStates: string[];
}

export interface BotConfigData {
  botName: string;
  tone: string;
  companyDescription: string;
  salesPitch: string;
  knowledgeBase: string[];
  businessHoursEnabled: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  outsideHoursMessage: string;
  escalationKeywords: string[];
  escalationMessage: string;
}

export const defaultBotConfig: BotConfigData = {
  botName: "Alex - Especialista em Vendas",
  tone: "consultative",
  companyDescription: "Soluções de alta performance e automação comercial.",
  salesPitch: "Qualificação inteligente de leads e atendimento 24h oficial no WhatsApp.",
  knowledgeBase: [
    "Atendimento 100% oficial via Meta WhatsApp Cloud API",
    "Lead scoring automático: Frio, Morno e Quente",
    "Planos flexíveis: Starter (R$ 197/mês), Pro (R$ 497/mês), Scale (R$ 997/mês)",
  ],
  businessHoursEnabled: false,
  businessHoursStart: "08:00",
  businessHoursEnd: "18:00",
  outsideHoursMessage: "Nosso horário comercial encerrou. Já registramos sua mensagem e responderemos assim que retornarmos!",
  escalationKeywords: ["humano", "atendente", "falar com pessoa", "vendedor", "suporte humano", "falar com alguem"],
  escalationMessage: "Entendido perfeitamente! Estou transferindo seu atendimento para nossa equipe de consultores humanos. Em instantes um especialista continuará com você.",
};

export class AgnosticStateMachineEngine {
  /**
   * Checks whether the message requests escalation to a human agent.
   */
  public static checkHumanEscalation(text: string, config: BotConfigData = defaultBotConfig): boolean {
    const normalized = text.toLowerCase().trim();
    const keywords = config.escalationKeywords || defaultBotConfig.escalationKeywords;
    return keywords.some((kw) => normalized.includes(kw.toLowerCase().trim()));
  }

  /**
   * Evaluates if current moment is inside business hours.
   */
  public static isWithinBusinessHours(config: BotConfigData = defaultBotConfig): boolean {
    if (!config.businessHoursEnabled) {
      return true;
    }

    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      const currentMinutes = hour * 60 + minute;

      const [startH, startM] = (config.businessHoursStart || "08:00").split(":").map(Number);
      const [endH, endM] = (config.businessHoursEnd || "18:00").split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch {
      return true;
    }
  }

  /**
   * Evaluates transition between stages based on lead score and message intent.
   */
  public static evaluateStageTransition(
    currentStage: string,
    leadScore: "frio" | "morno" | "quente",
    isEscalated: boolean
  ): string {
    if (isEscalated) {
      return "transbordo_humano";
    }

    if (leadScore === "quente") {
      return "lead_quente";
    }

    if (leadScore === "morno" && currentStage === "novo") {
      return "qualificando";
    }

    return currentStage;
  }
}
