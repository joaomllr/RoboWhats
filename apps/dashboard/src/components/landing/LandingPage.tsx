import React, { useState } from "react";
import {
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
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartOnboarding,
  onOpenDashboardDemo,
  onLogin,
}) => {
  // Live Simulator State
  const [simMessages, setSimMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: "Olá! 👋 Sou o assistente virtual inteligente da Fluxi. Como posso impulsionar as vendas do seu negócio hoje?",
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
          "Perfeito! Já notifiquei um de nossos consultores comerciais que entrará em contato em instantes.";
      } else if (lower.includes("oi") || lower.includes("olá") || lower.includes("boa tarde")) {
        newScore = "frio";
        reason = "Saudação de topo de funil ❄️";
        botReply = "Olá! Seja muito bem-vindo à Fluxi. Gostaria de ver uma demonstração de como qualificamos leads no WhatsApp?";
      }

      setCurrentScore(newScore);
      setScoreReason(reason);
      setSimMessages([...newHistory, { sender: "bot", text: botReply }]);
    }, 600);
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.location.hash) {
      window.history.pushState(null, "", window.location.pathname + window.location.search);
    }
  };

  const handleScrollToPricing = () => {
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
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
    <div className="min-h-screen bg-fluxi-cloud dark:bg-fluxi-graphite text-fluxi-graphite dark:text-slate-100 transition-colors">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-fluxi-graphite/90 border-b border-slate-200 dark:border-fluxi-graphiteBorder">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-3 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-fluxi-blue"
            aria-label="Voltar ao início"
          >
            <img
              src="/logo/icon-rounded-light-512.png"
              alt="Fluxi Logo"
              className="w-9 h-9 rounded-xl object-contain shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2 leading-none">
                <span className="text-xl font-extrabold tracking-tight text-fluxi-graphite dark:text-white">
                  FLUXI
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-fluxi-blue text-white uppercase tracking-wider">
                  Bots
                </span>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-fluxi-greenLight text-fluxi-green dark:bg-fluxi-green/10 dark:text-fluxi-green border border-fluxi-green/30">
                  WhatsApp Oficial
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-400 tracking-tight mt-0.5 hidden md:block">
                Sites • Automações • WhatsApp Bots
              </p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#diferenciais" className="hover:text-fluxi-blue transition-colors">
              Diferenciais
            </a>
            <a href="#simulador" className="hover:text-fluxi-blue transition-colors">
              Simulador IA
            </a>
            <a href="#planos" className="hover:text-fluxi-blue transition-colors">
              Planos & Preços
            </a>
            <a href="#seguranca" className="hover:text-fluxi-blue transition-colors">
              Segurança
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenDashboardDemo}
              className="text-xs sm:text-sm font-semibold px-3 py-2 text-slate-700 dark:text-slate-200 hover:text-fluxi-blue transition-colors"
            >
              Acessar Painel Demo
            </button>
            <button
              onClick={onLogin}
              className="text-xs sm:text-sm font-semibold px-3 py-2 text-fluxi-blue hover:underline transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => handleOpenCheckout("pro")}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-fluxi-green hover:bg-fluxi-greenHover active:scale-95 rounded-xl shadow-sm shadow-fluxi-green/30 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Assinar Plano</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,rgba(45,91,255,0.08),transparent)] dark:bg-[radial-gradient(45rem_50rem_at_top,rgba(45,91,255,0.15),transparent)] opacity-80" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-fluxi-blueLight border border-fluxi-blue/20 dark:bg-fluxi-blue/10 dark:border-fluxi-blue/30 text-fluxi-blue text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fluxi Bots • Inteligência Artificial Comercial & Meta Oficial</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Transforme seu WhatsApp em uma{" "}
              <span className="bg-gradient-to-r from-fluxi-blue via-fluxi-green to-fluxi-blue bg-clip-text text-transparent">
                máquina autônoma de vendas
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
              O robô comercial inteligente da <strong>Fluxi</strong> que atende seus clientes em segundos,
              qualifica o interesse de compra em tempo real e recupera conversas paradas no momento certo.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleScrollToPricing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-bold text-white bg-fluxi-green hover:bg-fluxi-greenHover active:scale-95 rounded-xl shadow-lg shadow-fluxi-green/25 transition-all"
              >
                <span>Começar Agora com 7 Dias Grátis</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onOpenDashboardDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-fluxi-graphiteLight hover:bg-slate-100 dark:hover:bg-fluxi-graphiteCard rounded-xl border border-slate-200 dark:border-fluxi-graphiteBorder transition-all"
              >
                <Bot className="w-5 h-5 text-fluxi-blue" />
                <span>Explorar Painel Demo</span>
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                <span>Conexão oficial com a Meta (sem risco de bloqueio)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                <span>Ativação simples e rápida em minutos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                <span>Respostas gratuitas dentro da janela oficial de 24h</span>
              </div>
            </div>
          </div>

          {/* 3. Live Interactive Bot Simulator Widget */}
          <div id="simulador" className="mt-16 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-fluxi-graphiteCard rounded-2xl shadow-2xl border border-slate-200 dark:border-fluxi-graphiteBorder overflow-hidden">
              <div className="bg-fluxi-graphite text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-fluxi-green animate-ping" />
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span>Simulador Interativo em Tempo Real</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-fluxi-graphiteLight text-fluxi-blueLight border border-fluxi-blue/30">
                        Fluxi IA Inteligente
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Digite uma mensagem como se fosse seu cliente</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-fluxi-graphiteLight/80 px-3 py-1.5 rounded-lg border border-fluxi-graphiteBorder">
                  <span className="text-xs text-slate-300">Intenção de Compra:</span>
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
              <div className="p-4 sm:p-6 bg-fluxi-cloud dark:bg-fluxi-graphite min-h-[280px] max-h-[380px] overflow-y-auto space-y-3">
                {simMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        msg.sender === "user"
                          ? "bg-fluxi-blue text-white rounded-br-none"
                          : "bg-white dark:bg-fluxi-graphiteCard text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-fluxi-graphiteBorder"
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status footer inside card */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-fluxi-graphiteCard border-t border-slate-200 dark:border-fluxi-graphiteBorder text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>💡 Diagnóstico da IA: {scoreReason}</span>
                <span className="hidden sm:inline font-semibold text-fluxi-green">Resposta em &lt; 1 segundo</span>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSimSend} className="p-3 bg-white dark:bg-fluxi-graphiteCard border-t border-slate-200 dark:border-fluxi-graphiteBorder flex gap-2">
                <input
                  type="text"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  placeholder="Ex: 'Qual o valor dos planos?' ou 'Quero falar com um vendedor agora'"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-fluxi-graphiteBorder bg-slate-50 dark:bg-fluxi-graphite text-sm focus:outline-none focus:ring-2 focus:ring-fluxi-blue"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-fluxi-green hover:bg-fluxi-greenHover active:scale-95 text-white text-sm font-bold rounded-xl shadow-sm shadow-fluxi-green/20 transition-all"
                >
                  Enviar
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Differentials Section (Market Proven) */}
      <section id="diferenciais" className="py-20 bg-white dark:bg-fluxi-graphite/40 border-y border-slate-200 dark:border-fluxi-graphiteBorder">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fluxi-blue dark:text-fluxi-blueLight">
              Automação e Presença Digital Fluxi
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Por que a Fluxi é a escolha certa para o seu WhatsApp
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-fluxi-cloud dark:bg-fluxi-graphiteCard border border-slate-200 dark:border-fluxi-graphiteBorder shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-fluxi-blueLight dark:bg-fluxi-blue/10 text-fluxi-blue flex items-center justify-center mb-5">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Motor Híbrido IA + Fluxo</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                A flexibilidade da IA Generativa para compreender qualquer mensagem sem engessar, aliada a etapas comerciais que garantem a qualificação do cliente.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-fluxi-cloud dark:bg-fluxi-graphiteCard border border-slate-200 dark:border-fluxi-graphiteBorder shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-5">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Lead Scoring em Tempo Real</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Classificação automática de Frio ❄️, Morno 🌤️ e Quente 🔥 visíveis na caixa de entrada para que sua equipe atenda primeiro quem tem pressa para comprar.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-fluxi-cloud dark:bg-fluxi-graphiteCard border border-slate-200 dark:border-fluxi-graphiteBorder shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Recuperação Automática 24h</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                O cliente parou de responder durante a conversa? O robô envia uma mensagem amigável de acompanhamento no momento ideal.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-fluxi-cloud dark:bg-fluxi-graphiteCard border border-slate-200 dark:border-fluxi-graphiteBorder shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Conexão Oficial Meta</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Esqueça leituras de QR code que desconectam toda semana. Conecte o número da sua empresa com segurança e estabilidade corporativa oficial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pricing Tiers Section */}
      <section id="planos" className="py-20 bg-fluxi-cloud dark:bg-fluxi-graphite">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fluxi-blue dark:text-fluxi-blueLight">
              Planos Transparentes e Previsíveis
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Comece agora e escale com mais vendas no WhatsApp
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="rounded-2xl border border-slate-200 dark:border-fluxi-graphiteBorder p-8 bg-white dark:bg-fluxi-graphiteCard flex flex-col justify-between hover:border-fluxi-blue transition-colors shadow-xs">
              <div>
                <h3 className="text-xl font-bold">Starter</h3>
                <p className="text-xs text-slate-500 mt-1">Para pequenas empresas e profissionais autônomos</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">R$ 197</span>
                  <span className="text-xs text-slate-500">/mês</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Até 1.000 contatos ativos/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>1 Número Oficial WhatsApp Cloud API</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Classificação de leads em tempo real</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>2 atendentes humanos inclusos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Respostas gratuitas na janela de 24h</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenCheckout("starter")}
                className="mt-8 w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 dark:bg-fluxi-graphiteLight text-slate-700 dark:text-slate-200 hover:bg-fluxi-green hover:text-white transition-all"
              >
                Assinar Plano Starter
              </button>
            </div>

            {/* Pro Plan (Highlighted) */}
            <div className="rounded-2xl border-2 border-fluxi-blue p-8 bg-white dark:bg-fluxi-graphiteCard shadow-xl shadow-fluxi-blue/10 flex flex-col justify-between relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-fluxi-blue text-white text-[11px] font-bold tracking-wide uppercase">
                Mais Escolhido
              </div>
              <div>
                <h3 className="text-xl font-bold">Pro</h3>
                <p className="text-xs text-slate-500 mt-1">Para empresas em crescimento e equipes comerciais</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-fluxi-blue">R$ 497</span>
                  <span className="text-xs text-slate-500">/mês</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Até 5.000 contatos ativos/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>IA com a personalidade e tom da sua marca</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Recuperação automática de conversas paradas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>10 atendentes humanos simultâneos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Painel de horários de pico e conversão</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenCheckout("pro")}
                className="mt-8 w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-fluxi-green hover:bg-fluxi-greenHover text-white shadow-md shadow-fluxi-green/30 active:scale-95 transition-all"
              >
                Assinar Plano Pro
              </button>
            </div>

            {/* Scale Plan */}
            <div className="rounded-2xl border border-slate-200 dark:border-fluxi-graphiteBorder p-8 bg-white dark:bg-fluxi-graphiteCard flex flex-col justify-between hover:border-fluxi-blue transition-colors shadow-xs">
              <div>
                <h3 className="text-xl font-bold">Scale</h3>
                <p className="text-xs text-slate-500 mt-1">Para operações com múltiplos números e setores</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">R$ 997</span>
                  <span className="text-xs text-slate-500">/mês</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Contatos e mensagens sem limites</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Múltiplos números e departamentos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Fluxos de atendimento customizados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Atendentes humanos ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-fluxi-green" />
                    <span>Suporte prioritário e onboarding dedicado</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleOpenCheckout("scale")}
                className="mt-8 w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 dark:bg-fluxi-graphiteLight text-slate-700 dark:text-slate-200 hover:bg-fluxi-green hover:text-white transition-all"
              >
                Assinar Plano Scale
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer id="seguranca" className="py-12 bg-white dark:bg-fluxi-graphiteCard border-t border-slate-200 dark:border-fluxi-graphiteBorder">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex flex-col sm:flex-row items-center gap-3 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-fluxi-blue"
            aria-label="Voltar ao início"
          >
            <img
              src="/logo/icon-rounded-light-512.png"
              alt="Fluxi Logo"
              className="w-8 h-8 rounded-lg object-contain shadow-xs"
            />
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="font-extrabold text-fluxi-graphite dark:text-white">FLUXI</span>
                <span className="text-xs font-bold text-fluxi-blue">Bots</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fluxi: Sites • Automações • WhatsApp Bots. Conexão 100% oficial com a Meta e conformidade com a LGPD.
              </p>
            </div>
          </button>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span>Privacidade & LGPD</span>
            <span>Termos de Uso</span>
            <button
              onClick={onOpenDashboardDemo}
              className="text-fluxi-blue font-semibold hover:underline"
            >
              Acessar Painel Demo
            </button>
          </div>
        </div>
      </footer>

      {/* 7. Simulated Checkout Modal -> Seamless Onboarding Handoff */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fluxi-graphite/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-fluxi-graphiteCard rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-fluxi-graphiteBorder relative">
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-fluxi-blueLight dark:bg-fluxi-blue/10 text-fluxi-blue flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Assinatura do {selectedPlanForCheckout.toUpperCase()}</h3>
                <p className="text-xs text-slate-500">Fluxo rápido de ativação do seu robô</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-fluxi-graphite p-4 rounded-xl border border-slate-200 dark:border-fluxi-graphiteBorder mb-5">
              <div className="flex justify-between items-center text-sm font-semibold mb-2">
                <span>Plano {selectedPlanForCheckout.toUpperCase()}</span>
                <span className="text-fluxi-blue font-bold">
                  {selectedPlanForCheckout === "starter"
                    ? "R$ 197/mês"
                    : selectedPlanForCheckout === "pro"
                    ? "R$ 497/mês"
                    : "R$ 997/mês"}
                </span>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <p>✓ 7 Dias de garantia incondicional</p>
                <p>✓ Ativação imediata sem burocracia</p>
                <p>✓ Configuração do número em poucos minutos</p>
              </div>
            </div>

            <div className="bg-fluxi-blueLight dark:bg-fluxi-blue/10 border border-fluxi-blue/20 dark:border-fluxi-blue/30 rounded-xl p-3 mb-5">
              <p className="text-xs text-fluxi-graphite dark:text-slate-100 font-semibold">
                Você não será cobrado agora.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Em 7 dias, cobraremos{" "}
                {selectedPlanForCheckout === "starter"
                  ? "R$ 197/mês"
                  : selectedPlanForCheckout === "pro"
                  ? "R$ 497/mês"
                  : "R$ 997/mês"}{" "}
                no cartão informado, a menos que cancele antes.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Cartão de Crédito (Simulação de Demonstração)
                </label>
                <input
                  type="text"
                  disabled
                  value="•••• •••• •••• 4242  (Modo Demonstração Ativo)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-fluxi-graphiteBorder bg-slate-100 dark:bg-fluxi-graphite text-slate-500"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-fluxi-green font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Ambiente seguro. Nenhuma cobrança real será realizada na demonstração.</span>
              </div>
            </div>

            <button
              onClick={handleConfirmSimulatedCheckout}
              disabled={isProcessingCheckout}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-fluxi-green hover:bg-fluxi-greenHover text-white shadow-md shadow-fluxi-green/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isProcessingCheckout ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Ativando seu plano...</span>
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
