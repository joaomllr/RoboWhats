import React, { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  Users,
  Plus,
  ArrowLeft,
  PauseCircle,
  PlayCircle,
  Ban,
  Sun,
  Moon,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { BotConfigManager } from "../config/BotConfigManager";
import { botConfigRowToUi, botConfigUiToRow, BotConfigRow } from "../../lib/botConfig";
import { initialBotConfig } from "../../lib/demoData";
import { BotConfig } from "../../types";

interface TenantListItem {
  id: string;
  name: string;
  plan_tier: string;
  status: string;
  created_at: string;
  messages_this_month: number;
}

interface StatusHistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  reason: string | null;
  created_at: string;
}

interface TenantDetail {
  tenant: {
    id: string;
    name: string;
    plan_tier: string;
    status: string;
    created_at: string;
  };
  botConfig: BotConfigRow | null;
  phoneIndex: { phone_number_id: string; waba_id: string | null } | null;
  statusHistory: StatusHistoryEntry[];
}

interface AdminConsoleProps {
  onBack: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

async function callAdminConsole<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-console", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-fluxi-greenLight text-fluxi-green border-fluxi-green/30",
  onboarding: "bg-amber-100 text-amber-700 border-amber-300",
  suspended: "bg-orange-100 text-orange-700 border-orange-300",
  cancelled: "bg-slate-200 text-slate-500 border-slate-300",
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  starter: "Starter",
  growth: "Pro",
  scale: "Scale",
};

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onBack, isDarkMode, onToggleDarkMode }) => {
  const [view, setView] = useState<"list" | "detail" | "create">("list");
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callAdminConsole<{ tenants: TenantListItem[] }>("list_tenants");
      setTenants(data.tenants);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "list") loadTenants();
  }, [view, loadTenants]);

  const openTenantDetail = async (tenantId: string) => {
    setActionError(null);
    setSelectedTenantId(tenantId);
    setView("detail");
    setDetail(null);
    try {
      const data = await callAdminConsole<TenantDetail>("get_tenant_detail", { tenant_id: tenantId });
      setDetail(data);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao carregar cliente.");
    }
  };

  const handleUpdateStatus = async (newStatus: string, reason?: string) => {
    if (!selectedTenantId) return;
    setActionError(null);
    try {
      await callAdminConsole("update_tenant_status", { tenant_id: selectedTenantId, new_status: newStatus, reason });
      await openTenantDetail(selectedTenantId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao atualizar status.");
    }
  };

  const handleSaveTenantBotConfig = async (uiConfig: BotConfig): Promise<{ error: string | null }> => {
    if (!selectedTenantId) return { error: "Nenhum cliente selecionado." };
    try {
      const row = botConfigUiToRow(selectedTenantId, uiConfig);
      const { tenant_id, ...botConfigFields } = row;
      await callAdminConsole("save_tenant_bot_config", { tenant_id, bot_config: botConfigFields });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao salvar configuração." };
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-fluxi-cloud dark:bg-fluxi-graphite">
      <header className="h-16 border-b border-slate-200 dark:border-fluxi-graphiteBorder bg-white dark:bg-fluxi-graphite px-4 sm:px-6 flex items-center justify-between gap-4 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-fluxi-blue/10 text-fluxi-blue flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-fluxi-graphite dark:text-white">
              Painel do Admin da Fluxi
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Gestão de clientes da plataforma</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-fluxi-graphiteLight transition-colors"
            title="Alternar Tema Escuro / Claro"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-fluxi-graphiteLight transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Painel</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-6xl mx-auto w-full">
        {view === "list" && (
          <TenantListView
            tenants={tenants}
            loading={loading}
            error={error}
            onOpenTenant={openTenantDetail}
            onCreateNew={() => setView("create")}
          />
        )}

        {view === "create" && (
          <CreateTenantView
            onCreated={(tenantId) => openTenantDetail(tenantId)}
            onCancel={() => setView("list")}
          />
        )}

        {view === "detail" && (
          <div className="space-y-6">
            <button
              onClick={() => setView("list")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para a lista de clientes</span>
            </button>

            {actionError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {!detail ? (
              <div className="p-8 text-center text-sm text-slate-400">Carregando cliente...</div>
            ) : (
              <>
                <TenantDetailHeader detail={detail} onUpdateStatus={handleUpdateStatus} />
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <BotConfigManager
                    config={detail.botConfig ? botConfigRowToUi(detail.botConfig) : initialBotConfig}
                    onSaveConfig={handleSaveTenantBotConfig}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const TenantListView: React.FC<{
  tenants: TenantListItem[];
  loading: boolean;
  error: string | null;
  onOpenTenant: (id: string) => void;
  onCreateNew: () => void;
}> = ({ tenants, loading, error, onOpenTenant, onCreateNew }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-fluxi-blue" />
          <span>Clientes ({tenants.length})</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">Todos os tenants cadastrados na plataforma</p>
      </div>
      <button
        onClick={onCreateNew}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-fluxi-green hover:bg-emerald-600 active:scale-95 text-white text-sm font-bold rounded-xl shadow-md shadow-fluxi-green/20 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span>Novo Cliente</span>
      </button>
    </div>

    {error && (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </div>
    )}

    {loading ? (
      <div className="p-8 text-center text-sm text-slate-400">Carregando clientes...</div>
    ) : tenants.length === 0 ? (
      <div className="p-8 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        Nenhum cliente cadastrado ainda.
      </div>
    ) : (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th className="px-5 py-3 font-bold">Empresa</th>
              <th className="px-5 py-3 font-bold">Plano</th>
              <th className="px-5 py-3 font-bold">Status</th>
              <th className="px-5 py-3 font-bold">Mensagens (mês)</th>
              <th className="px-5 py-3 font-bold">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr
                key={t.id}
                onClick={() => onOpenTenant(t.id)}
                className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">{t.name}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{PLAN_LABELS[t.plan_tier] || t.plan_tier}</td>
                <td className="px-5 py-3">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                      STATUS_STYLES[t.status] || STATUS_STYLES.cancelled
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{t.messages_this_month}</td>
                <td className="px-5 py-3 text-slate-400 text-xs">
                  {new Date(t.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const TenantDetailHeader: React.FC<{
  detail: TenantDetail;
  onUpdateStatus: (newStatus: string, reason?: string) => void;
}> = ({ detail, onUpdateStatus }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{detail.tenant.name}</h2>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
              STATUS_STYLES[detail.tenant.status] || STATUS_STYLES.cancelled
            }`}
          >
            {detail.tenant.status}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Plano {PLAN_LABELS[detail.tenant.plan_tier] || detail.tenant.plan_tier} · Criado em{" "}
          {new Date(detail.tenant.created_at).toLocaleDateString("pt-BR")}
          {detail.phoneIndex ? ` · Número: ${detail.phoneIndex.phone_number_id}` : " · Sem número conectado ainda"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {detail.tenant.status !== "active" && (
          <button
            onClick={() => onUpdateStatus("active", "Reativado pelo admin")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-fluxi-greenLight text-fluxi-green border border-fluxi-green/30 hover:bg-fluxi-green hover:text-white transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Reativar</span>
          </button>
        )}
        {detail.tenant.status === "active" && (
          <button
            onClick={() => onUpdateStatus("suspended", "Pausado manualmente pelo admin")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-500 hover:text-white transition-colors"
          >
            <PauseCircle className="w-4 h-4" />
            <span>Pausar</span>
          </button>
        )}
        {detail.tenant.status !== "cancelled" && (
          <button
            onClick={() => {
              if (window.confirm("Cancelar este cliente? Os dados não são apagados, só o acesso é bloqueado.")) {
                onUpdateStatus("cancelled", "Cancelado pelo admin");
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors"
          >
            <Ban className="w-4 h-4" />
            <span>Cancelar</span>
          </button>
        )}
      </div>
    </div>

    {detail.statusHistory.length > 0 && (
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Histórico de status</span>
        </p>
        <div className="space-y-1.5">
          {detail.statusHistory.map((h) => (
            <div key={h.id} className="text-xs text-slate-500 flex items-center gap-2">
              <span className="text-slate-300 dark:text-slate-600">
                {new Date(h.created_at).toLocaleString("pt-BR")}
              </span>
              <span>
                {h.old_status ? `${h.old_status} → ${h.new_status}` : `criado como ${h.new_status}`}
                {h.reason ? ` (${h.reason})` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const CreateTenantView: React.FC<{
  onCreated: (tenantId: string) => void;
  onCancel: () => void;
}> = ({ onCreated, onCancel }) => {
  const [name, setName] = useState("");
  const [planTier, setPlanTier] = useState<"starter" | "growth" | "scale">("starter");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nome da empresa é obrigatório.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const data = await callAdminConsole<{ tenantId: string }>("create_tenant", {
        name: name.trim(),
        plan_tier: planTier,
        phone_number_id: phoneNumberId.trim() || undefined,
        waba_id: wabaId.trim() || undefined,
      });
      onCreated(data.tenantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
      <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">Novo Cliente</h2>
      <p className="text-xs text-slate-500 mb-6">
        Cadastro manual — venda assistida, sem passar pelo checkout público. Depois de criar, você configura a
        persona do robô na tela seguinte (mesmo formulário de "Configuração IA").
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nome da Empresa
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-fluxi-blue"
            placeholder="Ex: Minha Empresa Vendas"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Plano</label>
          <select
            value={planTier}
            onChange={(e) => setPlanTier(e.target.value as "starter" | "growth" | "scale")}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-fluxi-blue"
          >
            <option value="starter">Starter</option>
            <option value="growth">Pro</option>
            <option value="scale">Scale</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number ID (opcional)
            </label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-fluxi-blue"
              placeholder="Deixe em branco se ainda não tiver"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              WABA ID (opcional)
            </label>
            <input
              type="text"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-fluxi-blue"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-fluxi-green hover:bg-emerald-600 active:scale-95 text-white text-sm font-bold rounded-xl shadow-md shadow-fluxi-green/20 transition-all disabled:opacity-60"
          >
            {isSubmitting ? "Criando..." : "Criar Cliente"}
          </button>
        </div>
      </form>
    </div>
  );
};
