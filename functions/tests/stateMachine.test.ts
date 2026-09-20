import { describe, it, expect } from "vitest";
import {
  AgnosticStateMachineEngine,
  defaultBotConfig,
  BotConfigData,
} from "../../supabase/functions/_shared/stateMachine.ts";

/**
 * Testa a implementação REAL deployada (supabase/functions/_shared/stateMachine.ts),
 * não uma cópia. A versão anterior deste arquivo testava functions/src/engine/stateMachine.ts
 * — um motor de state-graph completo, orientado a Firestore, com uma API
 * inteiramente diferente (evaluateTransition, ContactRecord.funnelStage, etc.)
 * que não existe mais em produção. Passava verde sem testar nada real.
 */
describe("AgnosticStateMachineEngine (implementação real, _shared/stateMachine.ts)", () => {
  describe("checkHumanEscalation", () => {
    it("detecta as palavras-chave padrão de escalação", () => {
      const messages = [
        "Quero falar com um humano agora",
        "Pode me passar para um atendente?",
        "Prefiro falar com vendedor",
        "quero suporte humano",
      ];
      for (const msg of messages) {
        expect(AgnosticStateMachineEngine.checkHumanEscalation(msg)).toBe(true);
      }
    });

    it("não escala uma mensagem comum sem palavras-chave", () => {
      expect(AgnosticStateMachineEngine.checkHumanEscalation("Quero saber os planos")).toBe(false);
    });

    it("é case-insensitive e ignora espaços nas bordas", () => {
      expect(AgnosticStateMachineEngine.checkHumanEscalation("  FALAR COM ATENDENTE  ")).toBe(true);
    });

    it("respeita uma lista de keywords customizada por tenant", () => {
      const customConfig: BotConfigData = {
        ...defaultBotConfig,
        escalationKeywords: ["gerente"],
      };
      expect(AgnosticStateMachineEngine.checkHumanEscalation("quero falar com o gerente", customConfig)).toBe(
        true
      );
      expect(
        AgnosticStateMachineEngine.checkHumanEscalation("quero falar com atendente", customConfig)
      ).toBe(false);
    });
  });

  describe("evaluateStageTransition", () => {
    it("transiciona para transbordo_humano quando há escalação, independente do score", () => {
      expect(AgnosticStateMachineEngine.evaluateStageTransition("novo", "frio", true)).toBe(
        "transbordo_humano"
      );
      expect(AgnosticStateMachineEngine.evaluateStageTransition("qualificando", "quente", true)).toBe(
        "transbordo_humano"
      );
    });

    it("transiciona para lead_quente quando o score é quente", () => {
      expect(AgnosticStateMachineEngine.evaluateStageTransition("novo", "quente", false)).toBe(
        "lead_quente"
      );
      expect(AgnosticStateMachineEngine.evaluateStageTransition("qualificando", "quente", false)).toBe(
        "lead_quente"
      );
    });

    it("transiciona de novo para qualificando quando o score é morno", () => {
      expect(AgnosticStateMachineEngine.evaluateStageTransition("novo", "morno", false)).toBe(
        "qualificando"
      );
    });

    it("mantém o estágio atual quando o score é morno mas já não está em novo", () => {
      expect(AgnosticStateMachineEngine.evaluateStageTransition("qualificando", "morno", false)).toBe(
        "qualificando"
      );
      expect(AgnosticStateMachineEngine.evaluateStageTransition("lead_quente", "morno", false)).toBe(
        "lead_quente"
      );
    });

    it("mantém o estágio atual quando o score é frio", () => {
      expect(AgnosticStateMachineEngine.evaluateStageTransition("novo", "frio", false)).toBe("novo");
      expect(AgnosticStateMachineEngine.evaluateStageTransition("qualificando", "frio", false)).toBe(
        "qualificando"
      );
    });
  });

  describe("isWithinBusinessHours", () => {
    it("retorna sempre true quando businessHoursEnabled é false", () => {
      const config: BotConfigData = { ...defaultBotConfig, businessHoursEnabled: false };
      expect(AgnosticStateMachineEngine.isWithinBusinessHours(config)).toBe(true);
    });

    it("usa a configuração padrão (desabilitado) quando nenhum config é passado", () => {
      expect(AgnosticStateMachineEngine.isWithinBusinessHours()).toBe(true);
    });
  });
});
