import { BotConfig, ContactRecord, BotStateDefinition } from "../types";

export interface StateMachineEvaluationInput {
  incomingText: string;
  contact: ContactRecord;
  config: BotConfig;
  proposedNextState?: string;
}

export interface StateMachineDecision {
  nextState: string;
  isEscalation: boolean;
  systemPromptAdditions: string;
}

/**
 * Evaluates the next state and behavior in a strictly agnostic manner
 * driven entirely by the tenant's configuration in Firestore.
 */
export class AgnosticStateMachineEngine {
  /**
   * Checks if current time is within tenant's defined business hours.
   */
  public static isWithinBusinessHours(config: BotConfig): boolean {
    if (!config.businessHours?.enabled) {
      return true;
    }

    try {
      const timezone = config.businessHours.timezone || "America/Sao_Paulo";
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      const currentMinutes = hour * 60 + minute;

      const [startH, startM] = (config.businessHours.start || "08:00").split(":").map(Number);
      const [endH, endM] = (config.businessHours.end || "18:00").split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch {
      return true;
    }
  }

  /**
   * Evaluates if the incoming message contains escalation keywords demanding human intervention.
   */
  public static checkHumanEscalation(text: string, config: BotConfig): boolean {
    const normalized = text.toLowerCase().trim();
    const defaultKeywords = ["humano", "atendente", "falar com alguem", "pessoa real", "suporte humano"];
    const configuredKeywords = config.escalation?.humanTakeoverKeywords || [];
    const allKeywords = [...defaultKeywords, ...configuredKeywords.map((k) => k.toLowerCase().trim())];

    return allKeywords.some((keyword) => normalized.includes(keyword));
  }

  /**
   * Transitions the conversation state based on the current state graph and LLM intent.
   */
  public static evaluateTransition(input: StateMachineEvaluationInput): StateMachineDecision {
    const { incomingText, contact, config, proposedNextState } = input;
    const currentStateKey = contact.currentState || config.stateMachine?.initialState || "welcome";
    const states = config.stateMachine?.states || {};
    const currentStateDef: BotStateDefinition | undefined = states[currentStateKey];

    // 1. Check for immediate human escalation triggers
    if (this.checkHumanEscalation(incomingText, config)) {
      return {
        nextState: "human_escalated",
        isEscalation: true,
        systemPromptAdditions: `O usuário solicitou atendimento humano. Confirme com empatia que um atendente entrará em contato em instantes e resuma o que ele precisa.`,
      };
    }

    // 2. Validate proposed next state against allowed transitions
    let finalNextState = currentStateKey;
    if (proposedNextState && states[proposedNextState]) {
      const allowedNext = currentStateDef?.nextPossibleStates || [];
      if (allowedNext.includes(proposedNextState) || proposedNextState === currentStateKey) {
        finalNextState = proposedNextState;
      }
    }

    const activeStateDef = states[finalNextState] || currentStateDef;
    const instructions = activeStateDef?.systemPromptInstructions || "Ajude o cliente com cordialidade e precisão.";

    return {
      nextState: finalNextState,
      isEscalation: false,
      systemPromptAdditions: `ESTADO ATUAL DO FLUXO: [${activeStateDef?.name || finalNextState}]. Instruções obrigatórias para este estado: ${instructions}`,
    };
  }
}
