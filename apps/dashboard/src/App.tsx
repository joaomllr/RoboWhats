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
        <div className="flex flex-col min-h-screen">
          {/* Top Navbar */}
          <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 flex items-center justify-between gap-4 z-30 shrink-0">
            {/* Logo & Tenant Identity */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-whatsapp-light flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <MessageSquare className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {tenant.companyName}
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                    Plano {tenant.plan}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {tenant.displayPhoneNumber} (API Oficial)
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setActiveTab("inbox")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "inbox"
                    ? "bg-white dark:bg-slate-900 text-brand-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Inbox Unificada</span>
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "analytics"
                    ? "bg-white dark:bg-slate-900 text-brand-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Insights de Vendas</span>
              </button>

              <button
                onClick={() => setActiveTab("config")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "config"
                    ? "bg-white dark:bg-slate-900 text-brand-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configuração IA</span>
              </button>
            </nav>

            {/* Right Tools: Dark Mode & Landing Switcher */}
            <div className="flex items-center gap-2">
              {/* AI Agent Status Pill */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                <Bot className="w-3.5 h-3.5 text-emerald-600" />
                <span>IA Vendedora: Ativa (3 chats)</span>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Alternar Tema Escuro / Claro"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Back to Public Landing */}
              <button
                onClick={() => setCurrentView("landing")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Ver Landing Page</span>
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
