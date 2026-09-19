import { describe, it, expect } from "vitest";
import { AgnosticStateMachineEngine } from "../src/engine/stateMachine";
import { BotConfig, ContactRecord } from "../src/types";

describe("Agnostic Hybrid State Machine Engine", () => {
  const mockConfig: BotConfig = {
    persona: {
      botName: "Vendedor IA",
      tone: "consultative",
      companyDescription: "Software SaaS",
      salesPitch: "Acelere suas vendas no WhatsApp",
      knowledgeBase: ["Plano Starter: R$ 197/mês", "Plano Pro: R$ 497/mês"],
    },
    businessHours: {
      enabled: true,
      timezone: "America/Sao_Paulo",
      start: "08:00",
      end: "18:00",
      outsideHoursMessage: "Estamos fora do horário.",
    },
    escalation: {
      humanTakeoverKeywords: ["humano", "atendente", "vendedor", "falar com pessoa"],
      notifyEmails: ["sales@example.com"],
      escalationMessage: "Transferindo para atendente...",
    },
    stateMachine: {
      initialState: "welcome",
      states: {
        welcome: {
          name: "Boas-vindas",
          description: "Primeiro contato",
          systemPromptInstructions: "Dê boas-vindas.",
          nextPossibleStates: ["qualification", "presentation", "human_escalated"],
        },
        qualification: {
          name: "Qualificação",
          description: "Entender perfil",
          systemPromptInstructions: "Pergunte sobre orçamento.",
          nextPossibleStates: ["presentation", "closing", "human_escalated"],
        },
        presentation: {
          name: "Apresentação",
          description: "Apresentar planos",
          systemPromptInstructions: "Apresente os planos.",
          nextPossibleStates: ["closing", "human_escalated"],
        },
      },
    },
  };

  const mockContact: ContactRecord = {
    id: "5511999998888",
    name: "João Silva",
    phoneNumber: "5511999998888",
    funnelStage: "new_lead",
    leadScore: "frio",
    scoreReason: "Início",
    currentState: "welcome",
    assignedAgent: "ai",
    tags: [],
    extractedData: {},
    lastActiveAt: null,
    createdAt: null,
  };

  it("should trigger human escalation when user message matches escalation keywords", () => {
    const messages = [
      "Quero falar com um humano agora",
      "Pode me passar para um atendente?",
      "Prefiro falar com vendedor",
    ];

    for (const msg of messages) {
      const decision = AgnosticStateMachineEngine.evaluateTransition({
        incomingText: msg,
        contact: mockContact,
        config: mockConfig,
      });

      expect(decision.isEscalation).toBe(true);
      expect(decision.nextState).toBe("human_escalated");
    }
  });

  it("should transition to an allowed next state", () => {
    const decision = AgnosticStateMachineEngine.evaluateTransition({
      incomingText: "Quero saber como funciona o produto",
      contact: mockContact,
      config: mockConfig,
      proposedNextState: "qualification",
    });

    expect(decision.isEscalation).toBe(false);
    expect(decision.nextState).toBe("qualification");
  });

  it("should block transition to an unauthorized state and stay in current state", () => {
    const decision = AgnosticStateMachineEngine.evaluateTransition({
      incomingText: "Quero pular tudo",
      contact: mockContact,
      config: mockConfig,
      proposedNextState: "closing", // not in welcome.nextPossibleStates
    });

    expect(decision.isEscalation).toBe(false);
    expect(decision.nextState).toBe("welcome");
  });

  it("should accurately detect business hours configuration", () => {
    const configDisabledHours = {
      ...mockConfig,
      businessHours: { ...mockConfig.businessHours, enabled: false },
    };
    expect(AgnosticStateMachineEngine.isWithinBusinessHours(configDisabledHours)).toBe(true);
  });
});
