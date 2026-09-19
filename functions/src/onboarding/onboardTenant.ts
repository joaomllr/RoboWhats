import * as admin from "firebase-admin";
import { BotConfig } from "../types";

export interface OnboardTenantRequest {
  companyName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  wabaId?: string;
  plan?: "starter" | "pro" | "enterprise";
  botName?: string;
  botTone?: "friendly" | "professional" | "enthusiastic" | "consultative";
  companyDescription?: string;
  salesPitch?: string;
}

export interface OnboardTenantResponse {
  success: boolean;
  tenantId: string;
  message: string;
}

/**
 * Onboards a new business tenant:
 * 1. Mints custom claims (tenantId, role) on the authenticated user.
 * 2. Seeds tenant document and default hybrid state machine configuration.
 * 3. Registers phone_number_id routing index.
 */
export async function handleTenantOnboarding(
  uid: string,
  data: OnboardTenantRequest,
  db: admin.firestore.Firestore
): Promise<OnboardTenantResponse> {
  const {
    companyName,
    phoneNumberId,
    displayPhoneNumber,
    wabaId = "",
    plan = "starter",
    botName = "Vendedor IA",
    botTone = "consultative",
    companyDescription = "Soluções de alta qualidade para empresas.",
    salesPitch = "Atendimento ágil, qualificação imediata e fechamento de vendas.",
  } = data;

  if (!companyName || !phoneNumberId) {
    throw new Error("companyName and phoneNumberId are required.");
  }

  // Generate deterministic or unique tenant ID
  const cleanSlug = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 24);
  const tenantId = `tenant_${cleanSlug}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Assign server-side custom claims to user
  await admin.auth().setCustomUserClaims(uid, {
    tenantId,
    role: "owner",
  });

  // 2. Default Bot & State Machine configuration
  const defaultConfig: BotConfig = {
    persona: {
      botName,
      tone: botTone,
      companyDescription,
      salesPitch,
      knowledgeBase: [
        `Empresa: ${companyName}`,
        `Atendimento 24h via WhatsApp automatizado`,
        `Dúvidas frequentes: prazos de entrega ágeis, suporte dedicado, garantia total`,
      ],
    },
    businessHours: {
      enabled: false,
      timezone: "America/Sao_Paulo",
      start: "08:00",
      end: "18:00",
      outsideHoursMessage:
        "Olá! Nosso horário de atendimento comercial é de segunda a sexta, das 8h às 18h. Já registramos sua mensagem e responderemos assim que retornarmos!",
    },
    escalation: {
      humanTakeoverKeywords: ["humano", "atendente", "falar com pessoa", "suporte humano", "falar com vendedor"],
      notifyEmails: [],
      escalationMessage:
        "Entendi perfeitamente! Estou transferindo seu atendimento para um de nossos especialistas humanos. Em instantes você será atendido.",
    },
    stateMachine: {
      initialState: "welcome",
      states: {
        welcome: {
          name: "Boas-vindas e Sondagem",
          description: "Primeiro contato, saudação calorosa e identificação da necessidade principal.",
          systemPromptInstructions:
            "Apresente-se com simpatia e pergunte como pode ajudar o cliente a alcançar seus objetivos hoje.",
          nextPossibleStates: ["qualification", "presentation", "human_escalated"],
        },
        qualification: {
          name: "Qualificação de Lead",
          description: "Entendimento do perfil, orçamento, urgência e volume do cliente.",
          systemPromptInstructions:
            "Faça perguntas breves e diretas para entender a necessidade e classifique mentalmente se o lead é frio, morno ou quente.",
          nextPossibleStates: ["presentation", "closing", "human_escalated"],
        },
        presentation: {
          name: "Apresentação da Solução e Preço",
          description: "Explicar a proposta de valor, planos e diferenciais.",
          systemPromptInstructions:
            "Apresente os benefícios principais da empresa, valores médios e gere desejo de fechar negócio.",
          nextPossibleStates: ["closing", "qualification", "human_escalated"],
        },
        closing: {
          name: "Fechamento e Próximos Passos",
          description: "Direcionar para link de pagamento, agendamento de demo ou envio de proposta.",
          systemPromptInstructions:
            "Proponha o próximo passo concreto: link de pagamento ou contato com executivo de vendas para fechar.",
          nextPossibleStates: ["completed", "human_escalated"],
        },
        completed: {
          name: "Venda / Atendimento Concluído",
          description: "Lead qualificado e fechado com sucesso.",
          systemPromptInstructions:
            "Agradeça a preferência e reforce que a equipe está sempre à disposição.",
          nextPossibleStates: ["welcome"],
          terminal: true,
        },
        human_escalated: {
          name: "Transbordo Humano",
          description: "Atendimento transferido para a fila de atendentes humanos no painel.",
          systemPromptInstructions:
            "Confirme que um atendente humano foi notificado.",
          nextPossibleStates: ["welcome"],
          terminal: true,
        },
      },
    },
  };

  const batch = db.batch();

  // Tenant document
  const tenantRef = db.collection("tenants").doc(tenantId);
  batch.set(tenantRef, {
    id: tenantId,
    ownerUid: uid,
    companyName,
    phoneNumberId,
    displayPhoneNumber,
    wabaId,
    plan,
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Config document
  const configRef = tenantRef.collection("config").doc("main");
  batch.set(configRef, defaultConfig);

  // Phone number index routing
  const phoneIndexRef = db.collection("phoneNumberIndex").doc(phoneNumberId);
  batch.set(phoneIndexRef, {
    tenantId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    success: true,
    tenantId,
    message: "Tenant onboarded successfully with isolated database and initial state machine.",
  };
}
