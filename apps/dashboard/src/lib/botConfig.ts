import { BotConfig } from "../types";

export interface BotConfigRow {
  tenant_id: string;
  bot_name: string;
  tone: "consultative" | "professional" | "friendly" | "enthusiastic";
  company_description: string;
  sales_pitch: string;
  knowledge_base: string[];
  business_hours_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  outside_hours_message: string;
  escalation_keywords: string[];
  escalation_message: string;
}

/**
 * A máquina de estados exibida em "Configuração IA" é só informativa — o
 * BotConfigManager não tem nenhum controle para editá-la, e o motor real
 * (AgnosticStateMachineEngine em _shared/stateMachine.ts) não é
 * configurável por tenant. Mesma descrição estática nos dois lugares
 * (painel do cliente e admin) em vez de inventar uma persistência para algo
 * que não é editável.
 */
const STATIC_STATE_MACHINE_DISPLAY: BotConfig["stateMachine"] = {
  initialState: "novo",
  states: {
    novo: {
      name: "Novo Contato",
      description: "Primeira mensagem recebida, ainda sem qualificação.",
      systemPromptInstructions: "",
      nextPossibleStates: ["qualificando", "lead_quente", "transbordo_humano"],
    },
    qualificando: {
      name: "Qualificando",
      description: "Demonstrou interesse específico no produto ou serviço.",
      systemPromptInstructions: "",
      nextPossibleStates: ["lead_quente", "transbordo_humano"],
    },
    lead_quente: {
      name: "Lead Quente",
      description: "Alta intenção de compra — perguntou preço ou pediu proposta.",
      systemPromptInstructions: "",
      nextPossibleStates: ["cliente", "perdido", "transbordo_humano"],
    },
    cliente: {
      name: "Cliente",
      description: "Fechou negócio — definido manualmente por um atendente humano.",
      systemPromptInstructions: "",
      nextPossibleStates: [],
    },
    perdido: {
      name: "Perdido",
      description: "Lead não avançou — definido manualmente por um atendente humano.",
      systemPromptInstructions: "",
      nextPossibleStates: [],
    },
    transbordo_humano: {
      name: "Transbordo Humano",
      description: "Conversa transferida para um atendente humano.",
      systemPromptInstructions: "",
      nextPossibleStates: [],
    },
  },
};

export function botConfigRowToUi(row: BotConfigRow): BotConfig {
  return {
    persona: {
      botName: row.bot_name,
      tone: row.tone,
      companyDescription: row.company_description,
      salesPitch: row.sales_pitch,
      knowledgeBase: row.knowledge_base,
    },
    businessHours: {
      enabled: row.business_hours_enabled,
      timezone: "America/Sao_Paulo",
      start: row.business_hours_start,
      end: row.business_hours_end,
      outsideHoursMessage: row.outside_hours_message,
    },
    escalation: {
      humanTakeoverKeywords: row.escalation_keywords,
      notifyEmails: [],
      escalationMessage: row.escalation_message,
    },
    stateMachine: STATIC_STATE_MACHINE_DISPLAY,
  };
}

export function botConfigUiToRow(tenantId: string, config: BotConfig): BotConfigRow {
  return {
    tenant_id: tenantId,
    bot_name: config.persona.botName,
    tone: config.persona.tone,
    company_description: config.persona.companyDescription,
    sales_pitch: config.persona.salesPitch,
    knowledge_base: config.persona.knowledgeBase,
    business_hours_enabled: config.businessHours.enabled,
    business_hours_start: config.businessHours.start,
    business_hours_end: config.businessHours.end,
    outside_hours_message: config.businessHours.outsideHoursMessage,
    escalation_keywords: config.escalation.humanTakeoverKeywords,
    escalation_message: config.escalation.escalationMessage,
  };
}
