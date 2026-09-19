import React, { useState } from "react";
import {
  MessageSquare,
  Bot,
  Flame,
  Zap,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  X,
  CreditCard,
  Lock,
} from "lucide-react";

interface LandingPageProps {
  onStartOnboarding: (selectedPlan: "starter" | "pro" | "scale") => void;
  onOpenDashboardDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartOnboarding,
  onOpenDashboardDemo,
}) => {
  // Live Simulator State
  const [simMessages, setSimMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: "Olá! 👋 Sou a IA de atendimento da AlphaTech. Como posso impulsionar suas vendas hoje?",
    },
  ]);
  const [simInput, setSimInput] = useState("");
  const [currentScore, setCurrentScore] = useState<"frio" | "morno" | "quente">("frio");
  const [scoreReason, setScoreReason] = useState("Início do contato");

  // Simulated Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<"starter" | "pro" | "scale">("pro");
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const handleSimSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInput.trim()) return;

    const userMsg = simInput.trim();
    const newHistory = [...simMessages, { sender: "user" as const, text: userMsg }];
    setSimMessages(newHistory);
    setSimInput("");

    // Simulate real-time Gemini reasoning & Lead Scoring
    setTimeout(() => {
      const lower = userMsg.toLowerCase();
      let botReply = "Com certeza! Temos planos sob medida que conectam em 5 minutos ao seu WhatsApp.";
      let newScore: "frio" | "morno" | "quente" = "morno";
      let reason = "Demonstrou interesse em entender o funcionamento da solução";

      if (
        lower.includes("preço") ||
        lower.includes("quanto custa") ||
        lower.includes("valor") ||
        lower.includes("comprar") ||
        lower.includes("fechar") ||
        lower.includes("proposta")
      ) {
        newScore = "quente";
        reason = "Lead consultou valores e demonstrou alta prontidão de compra 🔥";
        botReply =
          "Nosso Plano Pro sai por R$ 497/mês com até 5.000 contatos ativos e IA ilimitada! Gostaria de iniciar um teste de 7 dias com garantia agora mesmo?";
      } else if (lower.includes("humano") || lower.includes("atendente")) {
        newScore = "quente";
        reason = "Solicitou transbordo para consultor comercial especializado";
        botReply =
          "Perfeito! Já notifiquei um de nossos executivos de vendas que entrará em contato em instantes.";
      } else if (lower.includes("oi") || lower.includes("olá") || lower.includes("boa tarde")) {
        newScore = "frio";
        reason = "Saudação de topo de funil ❄️";
        botReply = "Olá! Seja muito bem-vindo. Gostaria de ver uma demonstração de como qualificamos leads no WhatsApp?";
      }

      setCurrentScore(newScore);
      setScoreReason(reason);
      setSimMessages([...newHistory, { sender: "bot", text: botReply }]);
    }, 600);
  };

  const handleOpenCheckout = (plan: "starter" | "pro" | "scale") => {
    setSelectedPlanForCheckout(plan);
    setCheckoutModalOpen(true);
  };

  const handleConfirmSimulatedCheckout = () => {
    setIsProcessingCheckout(true);
    setTimeout(() => {
      setIsProcessingCheckout(false);
      setCheckoutModalOpen(false);
      onStartOnboarding(selectedPlanForCheckout);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-whatsapp-light flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-brand-700 to-whatsapp-teal dark:from-white dark:via-brand-400 dark:to-whatsapp-light bg-clip-text text-transparent">
                WhatsApp Sales Hub
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                Oficial Meta API
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#diferenciais" className="hover:text-brand-600 transition-colors">
              Diferenciais
            </a>
            <a href="#simulador" className="hover:text-brand-600 transition-colors">
              Simulador IA
            </a>
            <a href="#planos" className="hover:text-brand-600 transition-colors">
              Planos & Preços
            </a>
            <a href="#seguranca" className="hover:text-brand-600 transition-colors">
              Segurança
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenDashboardDemo}
              className="text-xs sm:text-sm font-semibold px-3 py-2 text-slate-700 dark:text-slate-200 hover:text-brand-600 transition-colors"
            >
              Acessar Painel Demo
            </button>
            <button
              onClick={() => handleOpenCheckout("pro")}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 rounded-lg shadow-sm shadow-brand-600/30 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Assinar Plano</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.brand.100),transparent)] dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.brand.950),transparent)] opacity-50" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 dark:bg-brand-950/60 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-6 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Potencializado por Google Gemini 3.5 & Meta Cloud API</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Transforme seu WhatsApp em uma{" "}
              <span className="bg-gradient-to-r from-brand-600 via-whatsapp-teal to-brand-500 bg-clip-text text-transparent">
                máquina autônoma de vendas
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
              O primeiro robô comercial com <strong>IA Generativa híbrida</strong> que entende linguagem natural,
              qualifica leads em tempo real (Frio, Morno, Quente) e recupera conversas paradas dentro da janela gratuita da Meta.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleOpenCheckout("pro")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 rounded-xl shadow-lg shadow-brand-600/25 transition-all"
              >
                <span>Começar Agora com 7 Dias Grátis</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onOpenDashboardDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                <Bot className="w-5 h-5 text-brand-600" />
                <span>Explorar Painel Interativo</span>
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-600" />
                <span>Sem risco de banimento (API Oficial)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-600" />
                <span>Embedded Signup em 3 minutos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-600" />
                <span>Janela de 24h a R$ 0,00</span>
              </div>
            </div>
          </div>

          {/* 3. Live Interactive Bot Simulator Widget */}
          <div id="simulador" className="mt-16 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span>Simulador Interativo em Tempo Real</span>
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-800 text-brand-400">
                        Gemini 3.5 Flash-Lite
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Digite uma mensagem como se fosse seu cliente</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <span className="text-xs text-slate-300">Lead Scoring em tempo real:</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 ${
                      currentScore === "quente"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : currentScore === "morno"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    }`}
                  >
                    {currentScore === "quente" && <Flame className="w-3 h-3 text-rose-400 fill-current" />}
                    {currentScore}
                  </span>
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/60 min-h-[280px] max-h-[380px] overflow-y-auto space-y-3">
                {simMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        msg.sender === "user"
                          ? "bg-brand-600 text-white rounded-br-none"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status footer inside card */}
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>💡 Diagnóstico da IA: {scoreReason}</span>
                <span className="hidden sm:inline">Latência: ~350ms</span>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSimSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  placeholder="Ex: 'Quanto custa para 3.000 clientes?' ou 'Gostaria de fechar hoje'"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  Enviar
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Differentials Section (Market Proven) */}
      <section id="diferenciais" className="py-20 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              Validados contra o Mercado (Wati, respond.io, Blip)
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Por que somos a escolha vencedora em vendas via WhatsApp
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 flex items-center justify-center mb-5">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Motor Híbrido IA + Fluxo</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                A flexibilidade da IA Generativa para compreender qualquer mensagem sem engessar, aliada a uma máquina de estados que garante etapas de qualificação rigorosas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mb-5">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Lead Scoring em Tempo Real</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Tags automáticas de Frio ❄️, Morno 🌤️ e Quente 🔥 visíveis no painel de inbox para que seus atendentes humanos priorizem quem está com o cartão na mão.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Recuperação Proativa 24h</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                O cliente parou de responder no meio da proposta? O robô envia reengajamento inteligente antes de expirar a janela gratuita de 24 horas da Meta.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Embedded Signup Meta</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Esqueça leitura de QR code frágil que cai a cada 2 dias. Seu cliente conecta o próprio WhatsApp Business oficial em 3 minutos direto pelo painel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pricing Tiers Section */}
      <section id="planos" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              Planos Transparentes e Previsíveis
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Comece pequeno e escale conforme suas vendas explodem
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-8 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-brand-400 transition-colors">
              <div>
                <h3 className="text-xl font-bold">Starter</h3>
                <p className="text-xs text-slate-500 mt-1">Para pequenas empresas e profissionais autônomos</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">R$ 197</span>
                  <span className="text-xs text-slate-500">/mês</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Até 1.000 contatos ativos/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>1 Número Oficial WhatsApp Cloud API</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Lead Scoring em tempo real</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>2 atendentes humanos inclusos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Respostas na janela de 24h a R$ 0</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenCheckout("starter")}
                className="mt-8 w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white transition-all"
              >
                Assinar Plano Starter
              </button>
            </div>

            {/* Pro Plan (Highlighted) */}
            <div className="rounded-2xl border-2 border-brand-500 p-8 bg-white dark:bg-slate-900 shadow-xl shadow-brand-500/10 flex flex-col justify-between relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-brand-500 text-white text-[11px] font-bold tracking-wide uppercase">
                Mais Escolhido
              </div>
              <div>
                <h3 className="text-xl font-bold">Pro</h3>
                <p className="text-xs text-slate-500 mt-1">Para empresas em crescimento e times de vendas B2B</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-brand-600 dark:text-brand-400">R$ 497</span>
                  <span className="text-xs text-slate-500">/mês</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Até 5.000 contatos ativos/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>IA Gemini 3.5 com persona personalizada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Recuperação Proativa de Conversas 24h</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>10 atendentes humanos simultâneos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Painel de Insights de Vendas por horário</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenCheckout("pro")}
                className="mt-8 w-full py-3 px-4 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/30 transition-all"
              >
                Assinar Plano Pro
              </button>
            </div>

            {/* Scale Plan */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-8 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-brand-400 transition-colors">
              <div>
                <h3 className="text-xl font-bold">Scale</h3>
                <p className="text-xs text-slate-500 mt-1">Para operações de alto volume e múltiplos números</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">R$ 997</span>
                  <span className="text-xs text-slate-500">/mês</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Contatos e mensagens ilimitadas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Múltiplos números e departamentos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Máquina de estados avançada customizada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Atendentes humanos ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Gerente de contas e SLA dedicado</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenCheckout("scale")}
                className="mt-8 w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white transition-all"
              >
                Assinar Plano Scale
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer id="seguranca" className="py-12 bg-slate-100 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center text-white">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="font-bold">WhatsApp Sales Hub</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Plataforma Multi-Tenant em conformidade total com os termos da Meta WhatsApp Cloud API e LGPD.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span>Privacidade & LGPD</span>
            <span>Termos de Uso</span>
            <span>Status da API</span>
            <button
              onClick={onOpenDashboardDemo}
              className="text-brand-600 font-semibold hover:underline"
            >
              Demo do Painel
            </button>
          </div>
        </div>
      </footer>

      {/* 7. Simulated Checkout Modal -> Seamless Onboarding Handoff */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Assinatura do {selectedPlanForCheckout.toUpperCase()}</h3>
                <p className="text-xs text-slate-500">Etapa de checkout (Simulação para o MVP)</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-5">
              <div className="flex justify-between items-center text-sm font-semibold mb-2">
                <span>Plano {selectedPlanForCheckout.toUpperCase()}</span>
                <span>
                  {selectedPlanForCheckout === "starter"
                    ? "R$ 197/mês"
                    : selectedPlanForCheckout === "pro"
                    ? "R$ 497/mês"
                    : "R$ 997/mês"}
                </span>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <p>✓ 7 Dias de garantia incondicional</p>
                <p>✓ Ativação imediata sem fila de espera</p>
                <p>✓ Redirecionamento direto ao Wizard de Onboarding</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Cartão de Crédito (Simulado)
                </label>
                <input
                  type="text"
                  disabled
                  value="•••• •••• •••• 4242  (Modo Demonstração Ativo)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span>Ambiente seguro. Nenhuma cobrança real será feita nesta etapa.</span>
              </div>
            </div>

            <button
              onClick={handleConfirmSimulatedCheckout}
              disabled={isProcessingCheckout}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {isProcessingCheckout ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Ativando sua assinatura...</span>
                </>
              ) : (
                <>
                  <span>Confirmar e Configurar meu WhatsApp</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
