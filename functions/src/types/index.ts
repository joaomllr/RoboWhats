export type LeadScore = "frio" | "morno" | "quente";
export type FunnelStage = "new_lead" | "hot_lead" | "customer" | "lost";
export type AssignedAgent = "ai" | "human";

export interface BotStateDefinition {
  name: string;
  description: string;
  systemPromptInstructions: string;
  nextPossibleStates: string[];
  terminal?: boolean;
}

export interface BotConfig {
  persona: {
    botName: string;
    tone: "friendly" | "professional" | "enthusiastic" | "consultative";
    companyDescription: string;
    salesPitch: string;
    knowledgeBase: string[];
  };
  businessHours: {
    enabled: boolean;
    timezone: string;
    start: string; // e.g. "08:00"
    end: string;   // e.g. "18:00"
    outsideHoursMessage: string;
  };
  escalation: {
    humanTakeoverKeywords: string[];
    notifyEmails: string[];
    escalationMessage: string;
  };
  stateMachine: {
    initialState: string;
    states: Record<string, BotStateDefinition>;
  };
}

export interface ContactRecord {
  id: string; // E.164 phone number, e.g. "5511999998888"
  name: string;
  phoneNumber: string;
  funnelStage: FunnelStage;
  leadScore: LeadScore;
  scoreReason: string;
  currentState: string;
  assignedAgent: AssignedAgent;
  tags: string[];
  extractedData: Record<string, unknown>;
  lastActiveAt: any;
  createdAt: any;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  sender: "contact" | "bot" | "agent";
  text: string;
  timestamp: any;
  metaMessageId?: string;
  status: "sent" | "delivered" | "read" | "failed";
  tokensUsed?: {
    prompt: number;
    candidates: number;
  };
}

export interface MetaWebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface AIReasoningResult {
  replyText: string;
  leadScore: LeadScore;
  scoreReason: string;
  nextState: string;
  extractedData: Record<string, unknown>;
  isEscalationRequested: boolean;
  tokenUsage: {
    promptTokens: number;
    candidateTokens: number;
  };
}
