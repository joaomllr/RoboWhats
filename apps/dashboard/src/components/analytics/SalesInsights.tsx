import React from "react";
import {
  Flame,
  Users,
  Clock,
  DollarSign,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { Contact, TenantUsage } from "../../types";

interface SalesInsightsProps {
  contacts: Contact[];
  usage: TenantUsage;
}

export const SalesInsights: React.FC<SalesInsightsProps> = ({ contacts, usage }) => {
  // Funnel calculations
  const totalLeads = contacts.length;
  const hotLeads = contacts.filter((c) => c.leadScore === "quente").length;
  const customers = contacts.filter((c) => c.funnelStage === "customer").length;
  const aiHandled = contacts.filter((c) => c.assignedAgent === "ai").length;

  const qualificationRate = totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0;
  const closingRate = hotLeads > 0 ? Math.round((customers / hotLeads) * 100) : 0;

  // Peak lead hours simulation data
  const peakHours = [
    { hour: "08h", volume: 14, hotRate: 20 },
    { hour: "10h", volume: 45, hotRate: 65 },
    { hour: "12h", volume: 28, hotRate: 40 },
    { hour: "14h", volume: 58, hotRate: 85 }, // Peak
    { hour: "16h", volume: 52, hotRate: 78 },
    { hour: "18h", volume: 38, hotRate: 50 },
    { hour: "20h", volume: 22, hotRate: 35 },
    { hour: "22h", volume: 15, hotRate: 15 },
  ];

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total de Contatos
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {totalLeads}
            </span>
            <span className="text-xs font-semibold text-emerald-600">+24% este mês</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{aiHandled} atendidos 100% pelo Robô de IA</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Leads Quentes 🔥
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {hotLeads}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({qualificationRate}% do total)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Classificados com alta intenção de compra</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Clientes Fechados
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {customers}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              Taxa de {closingRate}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Conversão direta via WhatsApp</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Custo Estimado IA + Meta
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              R$ 0,45
            </span>
            <span className="text-xs font-semibold text-emerald-600">Cotas Grátis Ativas</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">1.420 msgs na janela gratuita de 24h</p>
        </div>
      </div>

      {/* Conversion Funnel & Peak Hours Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Stage Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Funil de Conversão do WhatsApp
              </h3>
              <p className="text-xs text-slate-500">Fluxo de avanço dos contatos entre as etapas</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>1. Novos Leads Recebidos (Topo)</span>
                <span>{totalLeads} contatos (100%)</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>2. Qualificados pela IA (Morno + Quente)</span>
                <span>
                  {hotLeads + 1} contatos ({Math.round(((hotLeads + 1) / totalLeads) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.round(((hotLeads + 1) / totalLeads) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>3. Leads Quentes com Alta Intenção 🔥</span>
                <span>
                  {hotLeads} contatos ({qualificationRate}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${qualificationRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>4. Clientes Convertidos 💰</span>
                <span>
                  {customers} clientes ({Math.round((customers / totalLeads) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.round((customers / totalLeads) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Peak Hours Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Horários de Pico de Leads Quentes
              </h3>
              <p className="text-xs text-slate-500">Distribuição de mensagens e leads com alta intenção por horário</p>
            </div>
            <Clock className="w-5 h-5 text-slate-400" />
          </div>

          <div className="h-48 flex items-end justify-between gap-2 pt-6">
            {peakHours.map((slot) => {
              const heightPercent = (slot.volume / 60) * 100;
              const isPeak = slot.volume >= 50;
              return (
                <div key={slot.hour} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-lg transition-all relative group ${
                      isPeak
                        ? "bg-rose-500 dark:bg-rose-600"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] whitespace-nowrap z-10">
                      {slot.volume} msgs ({slot.hotRate}% quentes)
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{slot.hour}</span>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              <strong>Insight de Vendas:</strong> O pico de clientes com alta prontidão de compra ocorre entre{" "}
              <strong>14h e 16h</strong>. O robô atendeu 100% dessas mensagens em menos de 1 segundo!
            </span>
          </div>
        </div>
      </div>

      {/* Metering & Usage Telemetry */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Instrumentação de Uso & Consumo do Mês ({usage.period})
            </h3>
            <p className="text-xs text-slate-500">Métricas gravadas por chamada no Firestore para faturamento e controle</p>
          </div>
          <span className="text-xs px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-full">
            Plano Pro Ativo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 block mb-1">Mensagens Meta (Janela 24h)</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {usage.metaMessages.freeCustomerCareWindow.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">Custo da Meta: R$ 0,00 (100% Grátis)</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 block mb-1">Templates Meta Pagos (Marketing/Utility)</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {(
                usage.metaMessages.billableTemplateMarketing +
                usage.metaMessages.billableTemplateUtility
              ).toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">Apenas mensagens fora da janela 24h</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 block mb-1">Tokens Gemini 3.5 Consumidos</span>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {(usage.geminiTokens.promptTokens + usage.geminiTokens.candidateTokens).toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Custo total estimado: US$ {usage.geminiTokens.totalCostEstimatedUsd.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
