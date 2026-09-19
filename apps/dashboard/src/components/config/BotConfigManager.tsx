import React, { useState } from "react";
import {
  Bot,
  Clock,
  UserCheck,
  GitBranch,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { BotConfig } from "../../types";

interface BotConfigManagerProps {
  config: BotConfig;
  onSaveConfig: (updatedConfig: BotConfig) => void;
}

export const BotConfigManager: React.FC<BotConfigManagerProps> = ({
  config: initialConfig,
  onSaveConfig,
}) => {
  const [config, setConfig] = useState<BotConfig>(initialConfig);
  const [newKbItem, setNewKbItem] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddKb = () => {
    if (!newKbItem.trim()) return;
    setConfig({
      ...config,
      persona: {
        ...config.persona,
        knowledgeBase: [...config.persona.knowledgeBase, newKbItem.trim()],
      },
    });
    setNewKbItem("");
  };

  const handleRemoveKb = (index: number) => {
    setConfig({
      ...config,
      persona: {
        ...config.persona,
        knowledgeBase: config.persona.knowledgeBase.filter((_, i) => i !== index),
      },
    });
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    setConfig({
      ...config,
      escalation: {
        ...config.escalation,
        humanTakeoverKeywords: [
          ...config.escalation.humanTakeoverKeywords,
          newKeyword.trim().toLowerCase(),
        ],
      },
    });
    setNewKeyword("");
  };

  const handleRemoveKeyword = (index: number) => {
    setConfig({
      ...config,
      escalation: {
        ...config.escalation,
        humanTakeoverKeywords: config.escalation.humanTakeoverKeywords.filter(
          (_, i) => i !== index
        ),
      },
    });
  };

  return (
    <form onSubmit={handleSave} className="p-6 sm:p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Header & Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bot className="w-6 h-6 text-brand-600" />
            <span>Configuração do Motor de Atendimento & Vendas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Parâmetros dinâmicos lidos pelo backend serverless em tempo de execução
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-sm font-bold rounded-xl shadow-md shadow-brand-600/25 transition-all self-start sm:self-auto"
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvo com Sucesso!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>

      {/* 1. Persona da IA */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Persona & Comportamento do Robô</h3>
            <p className="text-xs text-slate-500">Identidade, tom de voz e base de conhecimento da sua marca</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome do Atendente Virtual
            </label>
            <input
              type="text"
              value={config.persona.botName}
              onChange={(e) =>
                setConfig({
                  ...config,
                  persona: { ...config.persona, botName: e.target.value },
                })
              }
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tom de Voz
            </label>
            <select
              value={config.persona.tone}
              onChange={(e) =>
                setConfig({
                  ...config,
                  persona: { ...config.persona, tone: e.target.value as any },
                })
              }
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="consultative">Consultivo (Orientado à solução e qualificação)</option>
              <option value="professional">Profissional & Formal</option>
              <option value="friendly">Amigável & Próximo</option>
              <option value="enthusiastic">Entusiasmado & Vibrante</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descrição Resumida da Empresa
            </label>
            <input
              type="text"
              value={config.persona.companyDescription}
              onChange={(e) =>
                setConfig({
                  ...config,
                  persona: { ...config.persona, companyDescription: e.target.value },
                })
              }
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Discurso de Vendas Principal (Pitch)
            </label>
            <textarea
              rows={2}
              value={config.persona.salesPitch}
              onChange={(e) =>
                setConfig({
                  ...config,
                  persona: { ...config.persona, salesPitch: e.target.value },
                })
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        {/* Knowledge Base Bullets */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Base de Conhecimento Rápida (Perguntas Frequentes / Preços / Políticas)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: 'Entregamos em todo o Brasil em até 48 horas'"
              value={newKbItem}
              onChange={(e) => setNewKbItem(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
            <button
              type="button"
              onClick={handleAddKb}
              className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>

          <div className="space-y-2">
            {config.persona.knowledgeBase.map((kb, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <span>• {kb}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKb(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Horário de Atendimento */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Horário de Funcionamento Comercial</h3>
              <p className="text-xs text-slate-500">Controle o que acontece quando mensagens chegam fora do expediente</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.businessHours.enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  businessHours: { ...config.businessHours, enabled: e.target.checked },
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {config.businessHours.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Início do Horário Comercial
              </label>
              <input
                type="time"
                value={config.businessHours.start}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    businessHours: { ...config.businessHours, start: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fim do Horário Comercial
              </label>
              <input
                type="time"
                value={config.businessHours.end}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    businessHours: { ...config.businessHours, end: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mensagem Automática Fora do Horário
              </label>
              <textarea
                rows={2}
                value={config.businessHours.outsideHoursMessage}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    businessHours: {
                      ...config.businessHours,
                      outsideHoursMessage: e.target.value,
                    },
                  })
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Transbordo para Humano */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Gatilhos de Transbordo Humano</h3>
            <p className="text-xs text-slate-500">Palavras-chave que transferem automaticamente o atendimento para humanos</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: 'falar com especialista', 'gerente', 'reclamação'"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Gatilho</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {config.escalation.humanTakeoverKeywords.map((kw, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(idx)}
                  className="text-slate-400 hover:text-rose-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Máquina de Estados Agnóstica */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Fluxo Estruturado (Máquina de Estados)</h3>
            <p className="text-xs text-slate-500">Estados e regras de transição configuráveis por cliente sem alterar código</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(config.stateMachine.states).map(([stateKey, stateDef]) => (
            <div
              key={stateKey}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {stateDef.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">
                  {stateKey}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{stateDef.description}</p>
              <div className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                Transições: {stateDef.nextPossibleStates.join(" → ")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
};
