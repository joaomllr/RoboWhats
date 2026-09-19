export type LeadScore = "frio" | "morno" | "quente";
export type FunnelStage = "novo" | "qualificando" | "lead_quente" | "cliente" | "perdido" | "transbordo_humano";
export type PlanTier = "trial" | "starter" | "growth" | "scale";
export type AssignedAgent = "ai" | "human";

export interface Contact {
  id: string; // uuid
  tenant_id: string;
  wa_phone: string;
  name?: string | null;
  lead_score: LeadScore;
  stage: string;
  scoreReason?: string;
  assignedAgent?: AssignedAgent;
  avatar?: string;
  tags?: string[];
  extractedData?: Record<string, string>;
  lastMessageText?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  windowExpiresInHours?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  contact_id: string;
  direction: "inbound" | "outbound";
  message_body: string;
  message_type: string;
  sender?: "contact" | "bot" | "agent";
  text?: string;
  timestamp?: string;
  status?: "sent" | "delivered" | "read";
  isProactiveRecovery?: boolean;
  created_at?: string;
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
  id?: string;
  tenant_id?: string;
  period: string;
  meta_messages_free_window: number;
  meta_messages_paid: number;
  gemini_tokens_used: number;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan_tier: PlanTier;
  status: "onboarding" | "active" | "suspended" | "cancelled";
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  wabaId?: string;
  created_at?: string;
  updated_at?: string;
}
