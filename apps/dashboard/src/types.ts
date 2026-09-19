export type LeadScore = "frio" | "morno" | "quente";
export type FunnelStage = "new_lead" | "hot_lead" | "customer" | "lost";
export type AssignedAgent = "ai" | "human";

export interface Contact {
  id: string; // phone number e.g. 5511999998888
  name: string;
  phoneNumber: string;
  avatar?: string;
  funnelStage: FunnelStage;
  leadScore: LeadScore;
  scoreReason: string;
  currentState: string;
  assignedAgent: AssignedAgent;
  tags: string[];
  extractedData: Record<string, string>;
  lastMessageText: string;
  lastMessageTime: string;
  unreadCount: number;
  windowExpiresInHours: number; // hours remaining in 24h window
}

export interface ChatMessage {
  id: string;
  sender: "contact" | "bot" | "agent";
  text: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  isProactiveRecovery?: boolean;
}

export interface BotPersona {
  botName: string;
  tone: "friendly" | "professional" | "enthusiastic" | "consultative";
  companyDescription: string;
  salesPitch: string;
  knowledgeBase: string[];
}

export interface BusinessHoursConfig {
  enabled: boolean;
  timezone: string;
  start: string;
  end: string;
  outsideHoursMessage: string;
}

export interface EscalationConfig {
  humanTakeoverKeywords: string[];
  notifyEmails: string[];
  escalationMessage: string;
}

export interface StateDefinition {
  name: string;
  description: string;
  systemPromptInstructions: string;
  nextPossibleStates: string[];
}

export interface BotConfig {
  persona: BotPersona;
  businessHours: BusinessHoursConfig;
  escalation: EscalationConfig;
  stateMachine: {
    initialState: string;
    states: Record<string, StateDefinition>;
  };
}

export interface TenantUsage {
  period: string;
  metaMessages: {
    freeCustomerCareWindow: number;
    billableTemplateMarketing: number;
    billableTemplateUtility: number;
  };
  geminiTokens: {
    promptTokens: number;
    candidateTokens: number;
    totalCostEstimatedUsd: number;
  };
}

export interface Tenant {
  id: string;
  companyName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  wabaId: string;
  plan: "starter" | "pro" | "scale";
  status: "active" | "trialing";
  createdAt: string;
}
