import React, { useState } from "react";
import {
  Building2,
  Smartphone,
  Bot,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Tenant, BotConfig } from "../../types";

interface OnboardingWizardProps {
  initialPlan?: "starter" | "pro" | "scale";
  onComplete: (tenant: Tenant, botConfig: Partial<BotConfig>) => void;
  onCancel: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialPlan = "pro",
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 State: Company Profile
  const [companyName, setCompanyName] = useState("Minha Empresa Vendas");
  const [documentNumber, setDocumentNumber] = useState("12.345.678/0001-90");
  const [adminEmail, setAdminEmail] = useState("contato@minhaempresa.com.br");

  // Step 2 State: Meta WhatsApp Cloud API Connection
  const [connectionMode, setConnectionMode] = useState<"embedded" | "manual">("embedded");
  const [phoneNumberId, setPhoneNumberId] = useState("109876543210987");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("+55 11 98765-4321");
  const [wabaId, setWabaId] = useState("987654321012345");
  const [isVerifyingConnection, setIsVerifyingConnection] = useState(false);
  const [connectionVerified, setConnectionVerified] = useState(true);

  // Step 3 State: Bot Persona
  const [botName, setBotName] = useState("Alex - Consultor Comercial");
  const [botTone, setBotTone] = useState<"consultative" | "professional" | "friendly" | "enthusiastic">("consultative");
  const [companyDescription, setCompanyDescription] = useState(
    "Oferecemos soluções modernas para empresas aumentarem suas receitas e otimizarem processos."
  );
  const [salesPitch, setSalesPitch] = useState(
    "Atendimento imediato 24h, qualificação inteligente e fechamento rápido no WhatsApp."
  );

  // Step 4 State: Live Verification Test
  const [testMessage, setTestMessage] = useState("Olá, gostaria de saber os preços e como funciona.");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [isGeneratingTestReply, setIsGeneratingTestReply] = useState(false);

  const handleVerifyMetaConnection = () => {
    setIsVerifyingConnection(true);
    setTimeout(() => {
      setIsVerifyingConnection(false);
      setConnectionVerified(true);
    }, 1000);
  };

  const handleTestBotTurn = () => {
    if (!testMessage.trim()) return;
    setIsGeneratingTestReply(true);
    setTimeout(() => {
      setIsGeneratingTestReply(false);
      setTestReply(
        `Olá! Sou o ${botName}. ${salesPitch} Nosso time está pronto para apresentar a melhor proposta para o seu negócio. Gostaria de agendar uma demonstração rápida hoje?`
      );
    }, 800);
  };

  const handleFinish = () => {
    const newTenant: Tenant = {
      id: `tenant_${companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString().slice(-4)}`,
      companyName,
      phoneNumberId,
      displayPhoneNumber,
      wabaId,
      plan: initialPlan,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const newConfig: Partial<BotConfig> = {
      persona: {
        botName,
        tone: botTone,
        companyDescription,
        salesPitch,
        knowledgeBase: [
          `Empresa: ${companyName}`,
          `Descrição: ${companyDescription}`,
          `Discurso comercial: ${salesPitch}`,
        ],
      },
    };

    onComplete(newTenant, newConfig);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10">
        {/* Step Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Passo {currentStep} de 4
            </span>
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar Onboarding
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentStep >= step ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Company Profile */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Perfil da Sua Empresa</h2>
                <p className="text-xs text-slate-500">Dados cadastrais para identificação do seu tenant SaaS</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Empresa / Razão Social
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="Ex: Minha Empresa Vendas"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CNPJ ou CPF
                </label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail do Administrador (Para Alertas e Faturamento)
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="admin@empresa.com.br"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-600/25 transition-all"
              >
                <span>Avançar para Conexão WhatsApp</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: WhatsApp Meta Connection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-whatsapp-light/10 text-whatsapp-teal flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Conexão Oficial WhatsApp Cloud API</h2>
                <p className="text-xs text-slate-500">Conecte seu número oficial Meta sem QR codes frágeis</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setConnectionMode("embedded")}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  connectionMode === "embedded"
                    ? "bg-white dark:bg-slate-900 text-brand-600 shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                WhatsApp Embedded Signup (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => setConnectionMode("manual")}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  connectionMode === "manual"
                    ? "bg-white dark:bg-slate-900 text-brand-600 shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Configuração Manual / Teste
              </button>
            </div>

            {connectionMode === "embedded" ? (
              <div className="p-6 rounded-2xl border-2 border-dashed border-brand-300 dark:border-brand-900 bg-brand-50/50 dark:bg-brand-950/30 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-whatsapp-light/20 flex items-center justify-center text-whatsapp-teal">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Janela Popup da Meta Embedded Signup</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Faça login com seu Facebook Business para autorizar este número automaticamente com
                    verificação em 2 etapas oficial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyMetaConnection}
                  disabled={isVerifyingConnection}
                  className="px-6 py-2.5 bg-whatsapp-teal hover:bg-whatsapp-dark text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2"
                >
                  {isVerifyingConnection ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Conectando à Meta...</span>
                    </>
                  ) : connectionVerified ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>WhatsApp Conectado com Sucesso (+55 11 98765-4321)</span>
                    </>
                  ) : (
                    <span>Iniciar Conexão com a Meta</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number ID (Meta Graph API)
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Número de Exibição
                  </label>
                  <input
                    type="text"
                    value={displayPhoneNumber}
                    onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Business Account ID (WABA ID)
                  </label>
                  <input
                    type="text"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md transition-all"
              >
                <span>Avançar para Persona da IA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Bot Persona Configuration */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Personalidade & Tom de Voz da IA</h2>
                <p className="text-xs text-slate-500">Defina como o robô do seu negócio vai se comunicar com seus clientes</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Atendente Virtual
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none"
                  placeholder="Ex: Alex - Especialista em Vendas"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tom de Voz
                </label>
                <select
                  value={botTone}
                  onChange={(e) => setBotTone(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none"
                >
                  <option value="consultative">Consultivo (Especialista focado em entender e orientar a compra)</option>
                  <option value="professional">Profissional & Formal (Direto, polido e corporativo)</option>
                  <option value="friendly">Amigável & Caloroso (Proximidade com o cliente, emojis leves)</option>
                  <option value="enthusiastic">Entusiasmado & Enérgico (Vibrante e motivador)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição Resumida da Empresa
                </label>
                <textarea
                  rows={2}
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discurso de Vendas e Proposta de Valor
                </label>
                <textarea
                  rows={2}
                  value={salesPitch}
                  onChange={(e) => setSalesPitch(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md transition-all"
              >
                <span>Avançar para Teste ao Vivo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Live Test & Final Activation */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Validação e Ativação Imediata</h2>
                <p className="text-xs text-slate-500">Teste o comportamento do seu bot diretamente no navegador</p>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500">Mensagem de Teste:</span>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none"
                  />
                  <button
                    onClick={handleTestBotTurn}
                    disabled={isGeneratingTestReply}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    {isGeneratingTestReply ? "Simulando..." : "Testar Resposta"}
                  </button>
                </div>
              </div>

              {testReply && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 animate-fadeIn">
                  <span className="font-bold text-brand-600 flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" />
                    <span>{botName}:</span>
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">{testReply}</p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-bold">Tudo pronto para operar!</span> O número WhatsApp{" "}
                <strong>{displayPhoneNumber}</strong> está roteado exclusivamente para a sua conta com segurança
                Firestore isolada.
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              <button
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-8 py-3.5 font-bold text-sm text-white bg-brand-600 hover:bg-brand-700 active:scale-95 rounded-xl shadow-lg shadow-brand-600/30 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Concluir e Abrir Caixa de Entrada</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
