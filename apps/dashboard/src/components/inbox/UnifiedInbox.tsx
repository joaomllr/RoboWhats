import React, { useState } from "react";
import {
  Search,
  Bot,
  User,
  Flame,
  Clock,
  Send,
  Check,
  CheckCheck,
  Tag,
  Sparkles,
  ArrowRightLeft,
} from "lucide-react";
import { Contact, ChatMessage, FunnelStage, LeadScore } from "../../types";

interface UnifiedInboxProps {
  contacts: Contact[];
  messagesMap: Record<string, ChatMessage[]>;
  onSendMessage: (contactId: string, text: string) => void;
  onToggleAgent: (contactId: string, newAgent: "ai" | "human") => void;
  onUpdateFunnelStage: (contactId: string, newStage: FunnelStage) => void;
  onUpdateLeadScore: (contactId: string, newScore: LeadScore) => void;
  sendDisabledReason?: string;
}

export const UnifiedInbox: React.FC<UnifiedInboxProps> = ({
  contacts,
  messagesMap,
  onSendMessage,
  onToggleAgent,
  onUpdateFunnelStage,
  onUpdateLeadScore,
  sendDisabledReason,
}) => {
  const [selectedContactId, setSelectedContactId] = useState<string>(
    contacts[0]?.id || ""
  );
  const [funnelFilter, setFunnelFilter] = useState<FunnelStage | "all">("all");
  const [agentFilter, setAgentFilter] = useState<"all" | "ai" | "human">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMessage, setInputMessage] = useState("");

  const activeContact = contacts.find((c) => c.id === selectedContactId) || contacts[0];
  const activeMessages = activeContact ? messagesMap[activeContact.id] || [] : [];

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const contactName = c.name || "";
    const phone = c.wa_phone || "";
    const currentStage = c.stage || "novo";
    const agent = c.assignedAgent || "ai";

    const matchesSearch =
      contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery);
    const matchesFunnel = funnelFilter === "all" || currentStage === funnelFilter;
    const matchesAgent = agentFilter === "all" || agent === agentFilter;
    return matchesSearch && matchesFunnel && matchesAgent;
  });

  // Calculate counts for agents
  const aiHandledCount = contacts.filter((c) => (c.assignedAgent || "ai") === "ai").length;
  const humanHandledCount = contacts.filter((c) => c.assignedAgent === "human").length;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeContact) return;
    onSendMessage(activeContact.id, inputMessage.trim());
    setInputMessage("");
  };

  const getScoreBadge = (score?: LeadScore) => {
    switch (score) {
      case "quente":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-fluxi-coral/10 text-fluxi-coral dark:bg-fluxi-coral/20 dark:text-fluxi-coral border border-fluxi-coral/30">
            <Flame className="w-3 h-3 text-fluxi-coral fill-current" />
            <span>Quente</span>
          </span>
        );
      case "morno":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span>Morno</span>
          </span>
        );
      case "frio":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span>Frio</span>
          </span>
        );
    }
  };

  const getFunnelLabel = (stage: string) => {
    switch (stage) {
      case "novo":
        return "Novo Lead";
      case "qualificando":
        return "Qualificando";
      case "lead_quente":
        return "Lead Quente 🔥";
      case "cliente":
        return "Cliente 💰";
      case "perdido":
        return "Perdido";
      case "transbordo_humano":
        return "Transbordo 👤";
      default:
        return stage;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      {/* ------------------------------------------------------------- */}
      {/* COLUMN 1: Conversation List & Funnel Filters (Left)          */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
        {/* Search & Agent Overview Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-fluxi-blue"
            />
          </div>

          {/* Agent Switcher Chips (AI as a first-class agent) */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/70 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setAgentFilter("all")}
              className={`py-1.5 px-2 rounded-lg transition-all ${
                agentFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-fluxi-blue shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Todos ({contacts.length})
            </button>
            <button
              onClick={() => setAgentFilter("ai")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                agentFilter === "ai"
                  ? "bg-white dark:bg-slate-900 text-fluxi-blue shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-fluxi-blue" />
              <span>IA ({aiHandledCount})</span>
            </button>
            <button
              onClick={() => setAgentFilter("human")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                agentFilter === "human"
                  ? "bg-white dark:bg-slate-900 text-fluxi-blue shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <User className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Humano ({humanHandledCount})</span>
            </button>
          </div>

          {/* Funnel Stage Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setFunnelFilter("all")}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                funnelFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFunnelFilter("novo")}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                funnelFilter === "novo"
                  ? "bg-fluxi-blue text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Novos
            </button>
            <button
              onClick={() => setFunnelFilter("qualificando")}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                funnelFilter === "qualificando"
                  ? "bg-amber-500 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Qualificando
            </button>
            <button
              onClick={() => setFunnelFilter("lead_quente")}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium flex items-center gap-1 transition-all ${
                funnelFilter === "lead_quente"
                  ? "bg-fluxi-coral text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Flame className="w-3 h-3 text-white fill-current" />
              <span>Leads Quentes</span>
            </button>
            <button
              onClick={() => setFunnelFilter("cliente")}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                funnelFilter === "cliente"
                  ? "bg-fluxi-green text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Clientes
            </button>
            <button
              onClick={() => setFunnelFilter("perdido")}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                funnelFilter === "perdido"
                  ? "bg-slate-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Perdidos
            </button>
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhuma conversa encontrada neste filtro.
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = contact.id === activeContact?.id;
              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContactId(contact.id)}
                  className={`p-3.5 cursor-pointer transition-colors relative flex items-start gap-3 ${
                    isSelected
                      ? "bg-fluxi-blue/5 dark:bg-fluxi-blue/15 border-l-4 border-fluxi-blue"
                      : "hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={
                        contact.avatar ||
                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
                      }
                      alt={contact.name || "Contato"}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white shadow-sm ${
                        contact.assignedAgent === "ai"
                          ? "bg-fluxi-blue"
                          : "bg-slate-700"
                      }`}
                      title={
                        contact.assignedAgent === "ai"
                          ? "Atendido pelo Robô de IA"
                          : "Atendido por Humano"
                      }
                    >
                      {contact.assignedAgent === "ai" ? "🤖" : "👤"}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {contact.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {contact.lastMessageTime}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1.5">
                      {contact.lastMessageText}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getScoreBadge(contact.lead_score)}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {getFunnelLabel(contact.stage)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* COLUMN 2: Active Chat Conversation Thread (Center)           */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
        {activeContact ? (
          <>
            {/* Chat Top Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <img
                  src={
                    activeContact.avatar ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
                  }
                  alt={activeContact.name || "Contato"}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {activeContact.name}
                    </h3>
                    {getScoreBadge(activeContact.lead_score)}
                  </div>
                  <span className="text-xs text-slate-400">{activeContact.wa_phone}</span>
                </div>
              </div>

              {/* Agent Takeover Action */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onToggleAgent(
                      activeContact.id,
                      activeContact.assignedAgent === "ai" ? "human" : "ai"
                    )
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeContact.assignedAgent === "ai"
                      ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-200"
                      : "bg-fluxi-blue/10 dark:bg-fluxi-blue/20 text-fluxi-blue hover:bg-fluxi-blue/20"
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>
                    {activeContact.assignedAgent === "ai"
                      ? "Assumir Conversa (Humano)"
                      : "Devolver para o Robô de IA"}
                  </span>
                </button>
              </div>
            </div>

            {/* Messages Thread Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 whatsapp-chat-bg">
              {activeMessages.map((msg) => {
                const isFromContact = msg.sender === "contact";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isFromContact ? "items-start" : "items-end"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm text-sm ${
                        isFromContact
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/70 dark:border-slate-700"
                          : "bg-emerald-600 text-white rounded-tr-none"
                      }`}
                    >
                      {/* Sender badge if not contact */}
                      {!isFromContact && (
                        <div className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1 flex items-center gap-1">
                          {msg.sender === "bot" ? (
                            <>
                              <Bot className="w-3 h-3" />
                              <span>Robô de IA (Gemini)</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3" />
                              <span>Atendente Humano</span>
                            </>
                          )}
                          {msg.isProactiveRecovery && (
                            <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-900 rounded font-bold">
                              Recuperação 24h
                            </span>
                          )}
                        </div>
                      )}

                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                      <div
                        className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${
                          isFromContact
                            ? "text-slate-400"
                            : "text-emerald-100"
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        {!isFromContact && (
                          <span>
                            {msg.status === "read" ? (
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Box */}
            {sendDisabledReason ? (
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
                {sendDisabledReason}
              </div>
            ) : (
            <form
              onSubmit={handleSend}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  activeContact.assignedAgent === "ai"
                    ? "O robô está respondendo automaticamente. Digite para responder como humano..."
                    : "Digite sua resposta comercial..."
                }
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-fluxi-blue"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-fluxi-green hover:bg-emerald-600 active:scale-95 text-white shadow-sm shadow-fluxi-green/20 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Selecione uma conversa para visualizar o histórico.
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* COLUMN 3: Contact Context & Sales Intelligence (Right)        */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full md:w-80 lg:w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 overflow-y-auto shrink-0 space-y-6">
        {activeContact && (
          <>
            {/* Header Contact Info */}
            <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
              <img
                src={
                  activeContact.avatar ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
                }
                alt={activeContact.name || "Contato"}
                className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-fluxi-blue shadow-sm mb-3"
              />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {activeContact.name}
              </h3>
              <p className="text-xs text-slate-500">{activeContact.wa_phone}</p>
            </div>

            {/* Real-time Lead Scoring Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-fluxi-blue" />
                  <span>Lead Scoring IA</span>
                </span>
                {getScoreBadge(activeContact.lead_score)}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {activeContact.scoreReason || "Classificado pela IA com base nas interações"}
              </p>
              <div className="pt-2 flex gap-1">
                {(["frio", "morno", "quente"] as LeadScore[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateLeadScore(activeContact.id, s)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md uppercase transition-all ${
                      activeContact.lead_score === s
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Funnel Stage Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Estágio do Funil
              </label>
              <select
                value={activeContact.stage}
                onChange={(e) => onUpdateFunnelStage(activeContact.id, e.target.value as FunnelStage)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              >
                <option value="novo">Novo Lead</option>
                <option value="qualificando">Qualificando</option>
                <option value="lead_quente">Lead Quente 🔥</option>
                <option value="cliente">Cliente Fechado 💰</option>
                <option value="perdido">Perdido</option>
                <option value="transbordo_humano">Transbordo Humano 👤</option>
              </select>
            </div>

            {/* 24-Hour Customer Care Window Status */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-start gap-3">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                  Janela Meta 24h: Gratuita (R$ 0,00)
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Restam ~{activeContact.windowExpiresInHours}h para enviar respostas livres sem custo de template.
                </span>
              </div>
            </div>

            {/* Extracted Sales Intelligence Data */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Dados Extraídos pela IA
              </span>
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-1.5">
                {Object.entries(activeContact.extractedData || {}).length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhum dado extraído ainda.</p>
                ) : (
                  Object.entries(activeContact.extractedData || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-slate-500 capitalize">{key}:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {String(val)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tags Management */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Tags Comerciais</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(activeContact.tags || []).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
