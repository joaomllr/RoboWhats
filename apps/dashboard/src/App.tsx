import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  BarChart3,
  Bot,
  Settings,
  Sun,
  Moon,
  ExternalLink,
} from "lucide-react";
import { LandingPage } from "./components/landing/LandingPage";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { UnifiedInbox } from "./components/inbox/UnifiedInbox";
import { SalesInsights } from "./components/analytics/SalesInsights";
import { BotConfigManager } from "./components/config/BotConfigManager";
import {
  initialTenant,
  initialContacts,
  initialMessages,
  initialBotConfig,
  initialUsage,
} from "./lib/demoData";
import { Contact, ChatMessage, BotConfig, Tenant, FunnelStage, LeadScore } from "./types";

export const App: React.FC = () => {
  // Navigation View State
  const [currentView, setCurrentView] = useState<"landing" | "onboarding" | "dashboard">(
    "landing"
  );
  const [selectedPlanForOnboarding, setSelectedPlanForOnboarding] = useState<
    "starter" | "pro" | "scale"
  >("pro");
  const [activeTab, setActiveTab] = useState<"inbox" | "analytics" | "config">("inbox");

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Application Data State
  const [tenant, setTenant] = useState<Tenant>(initialTenant);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(initialMessages);
  const [botConfig, setBotConfig] = useState<BotConfig>(initialBotConfig);
  const [usage] = useState(initialUsage);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Onboarding Start from Landing
  const handleStartOnboarding = (plan: "starter" | "pro" | "scale") => {
    setSelectedPlanForOnboarding(plan);
    setCurrentView("onboarding");
  };

  // Onboarding Completion
  const handleOnboardingComplete = (newTenant: Tenant, newBotConfig: Partial<BotConfig>) => {
    setTenant(newTenant);
    setBotConfig((prev) => ({
      ...prev,
      ...newBotConfig,
      persona: {
        ...prev.persona,
        ...(newBotConfig.persona || {}),
      },
    }));
    setCurrentView("dashboard");
    setActiveTab("inbox");
  };

  // Inbox: Send message handler
  const handleSendMessage = (contactId: string, text: string) => {
    const targetContact = contacts.find((c) => c.id === contactId);
    if (!targetContact) return;

    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      contact_id: contactId,
      direction: "outbound",
      message_body: text,
      message_type: "text",
      sender: "agent",
      text,
      timestamp: "Agora",
      status: "delivered",
    };

    setMessagesMap((prev) => ({
      ...prev,
      [contactId]: [...(prev[contactId] || []), newMsg],
    }));

    // Update contact last message
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? {
              ...c,
              lastMessageText: text,
              lastMessageTime: "Agora",
            }
          : c
      )
    );
  };

  // Inbox: Toggle Agent (AI vs Human)
  const handleToggleAgent = (contactId: string, newAgent: "ai" | "human") => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, assignedAgent: newAgent } : c))
    );
  };

  // Inbox: Update Funnel Stage
  const handleUpdateFunnelStage = (contactId: string, newStage: FunnelStage) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, funnelStage: newStage } : c))
    );
  };

  // Inbox: Update Lead Score
  const handleUpdateLeadScore = (contactId: string, newScore: LeadScore) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, leadScore: newScore } : c))
    );
  };

  // Config: Save Bot Config
  const handleSaveConfig = (updatedConfig: BotConfig) => {
    setBotConfig(updatedConfig);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* ============================================================= */}
      {/* 1. PUBLIC SALES LANDING VIEW                                  */}
      {/* ============================================================= */}
      {currentView === "landing" && (
        <LandingPage
          onStartOnboarding={handleStartOnboarding}
          onOpenDashboardDemo={() => setCurrentView("dashboard")}
        />
      )}

      {/* ============================================================= */}
      {/* 2. ONBOARDING WIZARD VIEW                                     */}
      {/* ============================================================= */}
      {currentView === "onboarding" && (
        <OnboardingWizard
          initialPlan={selectedPlanForOnboarding}
          onComplete={handleOnboardingComplete}
          onCancel={() => setCurrentView("landing")}
        />
      )}

      {/* ============================================================= */}
      {/* 3. AUTHENTICATED MULTI-TENANT DASHBOARD                       */}
      {/* ============================================================= */}
      {currentView === "dashboard" && (
        <div className="flex flex-col min-h-screen bg-fluxi-cloud dark:bg-fluxi-graphite">
          {/* Top Navbar */}
          <header className="h-16 border-b border-slate-200 dark:border-fluxi-graphiteBorder bg-white dark:bg-fluxi-graphite px-4 sm:px-6 flex items-center justify-between gap-4 z-30 shrink-0">
            {/* Fluxi Brand & Tenant Identity */}
            <div className="flex items-center gap-4">
              {/* Mother Brand Logo & Wordmark */}
              <div className="flex items-center gap-2.5 pr-4 border-r border-slate-200 dark:border-fluxi-graphiteBorder">
                <img
                  src="/logo/icon-rounded-512.png"
                  alt="Fluxi Logo"
                  className="w-8 h-8 rounded-lg object-contain shadow-xs"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-base font-extrabold tracking-tight text-fluxi-graphite dark:text-white">
                      FLUXI
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-fluxi-blue text-white uppercase tracking-wider">
                      Bots
                    </span>
                  </div>
                  <span className="text-[9px] font-medium text-slate-400 dark:text-slate-400 tracking-tight mt-0.5 hidden sm:inline">
                    Sites • Automações • WhatsApp Bots
                  </span>
                </div>
              </div>

              {/* Active Tenant Information */}
              <div className="flex items-center gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {tenant.name}
                    </h2>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-fluxi-blueLight text-fluxi-blue dark:bg-fluxi-blue/10 dark:text-fluxi-blueLight border border-fluxi-blue/20">
                      Plano {tenant.plan_tier}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-whatsapp-accent font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-whatsapp-accent animate-pulse" />
                      {tenant.displayPhoneNumber} (API Oficial)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-fluxi-graphiteLight rounded-xl">
              <button
                onClick={() => setActiveTab("inbox")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "inbox"
                    ? "bg-white dark:bg-fluxi-graphite text-fluxi-blue shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-fluxi-blue"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Inbox Unificada</span>
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "analytics"
                    ? "bg-white dark:bg-fluxi-graphite text-fluxi-blue shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-fluxi-blue"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Insights de Vendas</span>
              </button>

              <button
                onClick={() => setActiveTab("config")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "config"
                    ? "bg-white dark:bg-fluxi-graphite text-fluxi-blue shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-fluxi-blue"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configuração IA</span>
              </button>
            </nav>

            {/* Right Tools: Dark Mode & Landing Switcher */}
            <div className="flex items-center gap-2">
              {/* AI Agent Status Pill */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fluxi-greenLight dark:bg-fluxi-green/10 border border-fluxi-green/30 text-[11px] text-fluxi-green font-bold">
                <Bot className="w-3.5 h-3.5 text-fluxi-green" />
                <span>IA Vendedora: Ativa</span>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-fluxi-graphiteLight transition-colors"
                title="Alternar Tema Escuro / Claro"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Back to Public Landing */}
              <button
                onClick={() => setCurrentView("landing")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-fluxi-graphiteLight transition-colors"
              >
                <span>Ver Landing Fluxi</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </header>

          {/* Main Dashboard Canvas */}
          <main className="flex-1 overflow-y-auto">
            {activeTab === "inbox" && (
              <UnifiedInbox
                contacts={contacts}
                messagesMap={messagesMap}
                onSendMessage={handleSendMessage}
                onToggleAgent={handleToggleAgent}
                onUpdateFunnelStage={handleUpdateFunnelStage}
                onUpdateLeadScore={handleUpdateLeadScore}
              />
            )}

            {activeTab === "analytics" && <SalesInsights contacts={contacts} usage={usage} />}

            {activeTab === "config" && (
              <BotConfigManager config={botConfig} onSaveConfig={handleSaveConfig} />
            )}
          </main>
        </div>
      )}
    </div>
  );
};
