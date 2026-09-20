export type LeadScore = "frio" | "morno" | "quente";
export type PlanTier = "trial" | "starter" | "growth" | "scale";
export type TenantStatus = "onboarding" | "active" | "suspended" | "cancelled";
export type UserRole = "admin" | "agent";

export interface TenantRecord {
  id: string;
  name: string;
  plan_tier: PlanTier;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export interface TenantUserRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface PhoneNumberIndexRecord {
  phone_number_id: string;
  tenant_id: string;
  waba_id?: string | null;
  created_at: string;
}

export interface ContactRecord {
  id: string;
  tenant_id: string;
  wa_phone: string;
  name?: string | null;
  lead_score: LeadScore;
  stage: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationRecord {
  id: string;
  tenant_id: string;
  contact_id: string;
  direction: "inbound" | "outbound";
  message_body: string;
  message_type: string;
  created_at: string;
}

export interface UsageRecord {
  id: string;
  tenant_id: string;
  period: string; // "2026-09"
  meta_messages_free_window: number;
  meta_messages_paid: number;
  gemini_tokens_used: number;
  created_at: string;
  updated_at: string;
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
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
            message?: string;
            error_data?: { details?: string };
          }>;
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
  isEscalationRequested: boolean;
  tokenUsage: {
    promptTokens: number;
    candidateTokens: number;
  };
}
