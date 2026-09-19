import { Contact, ChatMessage, BotConfig, TenantUsage, Tenant } from "../types";

export const initialTenant: Tenant = {
  id: "tenant_alpha_tech_demo",
  companyName: "AlphaTech Soluções",
  phoneNumberId: "109876543210987",
  displayPhoneNumber: "+55 11 98765-4321",
  wabaId: "987654321012345",
  plan: "pro",
  status: "active",
  createdAt: "2026-09-01T10:00:00Z",
};

export const initialContacts: Contact[] = [
  {
    id: "5511998877665",
    name: "Mariana Souza",
    phoneNumber: "+55 (11) 99887-7665",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    funnelStage: "hot_lead",
    leadScore: "quente",
    scoreReason: "Solicitou proposta formal do Plano Pro e quer fechar hoje",
    currentState: "closing",
    assignedAgent: "ai",
    tags: ["Decisor", "Urgência Alta", "Empresa 50+ func"],
    extractedData: {
      empresa: "Souza & Associados",
      tamanho: "45 colaboradores",
      interesse: "Plano Pro Anual",
      orcamento: "R$ 6.000/ano",
    },
    lastMessageText: "Perfeito! Pode me mandar o link para pagamento da anuidade com o desconto?",
    lastMessageTime: "14:42",
    unreadCount: 1,
    windowExpiresInHours: 21,
  },
  {
    id: "5521987654321",
    name: "Carlos Eduardo Mendes",
    phoneNumber: "+55 (21) 98765-4321",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    funnelStage: "new_lead",
    leadScore: "morno",
    scoreReason: "Tem interesse em automatizar suporte, mas está comparando alternativas",
    currentState: "presentation",
    assignedAgent: "ai",
    tags: ["E-commerce", "Comparando preços"],
    extractedData: {
      empresa: "Moda Carioca Store",
      volumeMensal: "3.500 conversas/mês",
    },
    lastMessageText: "Como vocês comparam em relação a ferramentas como Wati ou respond.io?",
    lastMessageTime: "13:15",
    unreadCount: 0,
    windowExpiresInHours: 18,
  },
  {
    id: "5531991234567",
    name: "Rodrigo Vasconcelos",
    phoneNumber: "+55 (31) 99123-4567",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    funnelStage: "customer",
    leadScore: "quente",
    scoreReason: "Cliente ativo. Fechou contrato em 12/09",
    currentState: "completed",
    assignedAgent: "human",
    tags: ["Cliente Ativo", "Plano Pro"],
    extractedData: {
      contrato: "PRO-2026-981",
      vendedor: "Ana Beatriz",
    },
    lastMessageText: "Obrigado pela integração! O robô já está atendendo nossos clientes super bem.",
    lastMessageTime: "Ontem",
    unreadCount: 0,
    windowExpiresInHours: 5,
  },
  {
    id: "5541988887777",
    name: "Fernanda Lima",
    phoneNumber: "+55 (41) 98888-7777",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    funnelStage: "new_lead",
    leadScore: "frio",
    scoreReason: "Apenas mandou oi e não especificou segmento de atuação",
    currentState: "welcome",
    assignedAgent: "ai",
    tags: ["Topo de Funil"],
    extractedData: {},
    lastMessageText: "Oi, como funciona?",
    lastMessageTime: "10:04",
    unreadCount: 0,
    windowExpiresInHours: 14,
  },
  {
    id: "5519977776666",
    name: "Lucas Alencar",
    phoneNumber: "+55 (19) 97777-6666",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    funnelStage: "lost",
    leadScore: "frio",
    scoreReason: "Lead sem orçamento no momento para planos empresariais",
    currentState: "welcome",
    assignedAgent: "ai",
    tags: ["Sem orçamento", "Nutrição"],
    extractedData: {
      motivoPerda: "Preço fora do momento inicial",
    },
    lastMessageText: "Entendi, no momento meu negócio é muito pequeno. Volto a falar no próximo ano.",
    lastMessageTime: "17/09",
    unreadCount: 0,
    windowExpiresInHours: 0,
  },
];

export const initialMessages: Record<string, ChatMessage[]> = {
  "5511998877665": [
    {
      id: "m1",
      sender: "contact",
      text: "Olá! Vi o anúncio de vocês sobre robô de WhatsApp com IA e lead scoring.",
      timestamp: "14:35",
      status: "read",
    },
    {
      id: "m2",
      sender: "bot",
      text: "Olá Mariana, seja muito bem-vinda à AlphaTech! Sou o Alex, consultor de IA. Você gostaria de aumentar as vendas ou desafogar o suporte ao cliente com o WhatsApp?",
      timestamp: "14:35",
      status: "read",
    },
    {
      id: "m3",
      sender: "contact",
      text: "Nosso foco principal é vendas! Temos cerca de 50 colaboradores e recebemos centenas de mensagens por dia, mas os atendentes demoram para responder os leads quentes.",
      timestamp: "14:38",
      status: "read",
    },
    {
      id: "m4",
      sender: "bot",
      text: "Excelente! É exatamente nessa dor que o AlphaTech se destaca: nossa IA classifica os leads em tempo real (Frio, Morno, Quente) e já coleta as informações essenciais. Para o seu porte, o Plano Pro com até 5.000 contatos ativos e suporte prioritário é a escolha ideal!",
      timestamp: "14:39",
      status: "read",
    },
    {
      id: "m5",
      sender: "contact",
      text: "Perfeito! Pode me mandar o link para pagamento da anuidade com o desconto?",
      timestamp: "14:42",
      status: "delivered",
    },
  ],
  "5521987654321": [
    {
      id: "m20",
      sender: "contact",
      text: "Boa tarde! Vocês integram direto com a Meta ou usam QR code?",
      timestamp: "13:10",
      status: "read",
    },
    {
      id: "m21",
      sender: "bot",
      text: "Boa tarde Carlos! Nossa integração é 100% oficial via Meta WhatsApp Cloud API. Isso significa zero risco de banimento de número, estabilidade corporativa e você conecta seu número via WhatsApp Embedded Signup em minutos!",
      timestamp: "13:11",
      status: "read",
    },
    {
      id: "m22",
      sender: "contact",
      text: "Como vocês comparam em relação a ferramentas como Wati ou respond.io?",
      timestamp: "13:15",
      status: "delivered",
    },
  ],
};

export const initialBotConfig: BotConfig = {
  persona: {
    botName: "Alex - Especialista em Vendas",
    tone: "consultative",
    companyDescription: "AlphaTech Soluções em Inteligência Artificial para WhatsApp e Vendas B2B.",
    salesPitch: "Transformamos o atendimento em uma máquina autônoma de vendas que qualifica leads 24/7.",
    knowledgeBase: [
      "Plano Starter: R$ 197/mês (até 1.000 contatos ativos, IA Gemini incluída, 2 atendentes humanos)",
      "Plano Pro: R$ 497/mês (até 5.000 contatos ativos, automações avançadas, IA ilimitada, 10 atendentes)",
      "Plano Scale: R$ 997/mês (contatos ilimitados, onboarding assistido, SLA dedicado)",
      "Integração 100% oficial Meta WhatsApp Cloud API (sem risco de banimento)",
      "Lead scoring automático em tempo real: Frio, Morno e Quente",
    ],
  },
  businessHours: {
    enabled: true,
    timezone: "America/Sao_Paulo",
    start: "08:00",
    end: "19:00",
    outsideHoursMessage:
      "Olá! Nosso time comercial atende de segunda a sexta, das 8h às 19h. Registrei sua dúvida e nosso robô de IA já está coletando suas necessidades para agilizar seu atendimento!",
  },
  escalation: {
    humanTakeoverKeywords: ["humano", "atendente", "falar com pessoa", "vendedor", "urgente"],
    notifyEmails: ["vendas@alphatech.com.br"],
    escalationMessage:
      "Perfeito! Já acionei nosso time de consultores humanos. Em instantes um especialista continuará seu atendimento.",
  },
  stateMachine: {
    initialState: "welcome",
    states: {
      welcome: {
        name: "Boas-vindas",
        description: "Recepção calorosa e descoberta de foco comercial",
        systemPromptInstructions: "Saude o cliente pelo nome se disponível e pergunte o objetivo principal dele.",
        nextPossibleStates: ["qualification", "presentation", "human_escalated"],
      },
      qualification: {
        name: "Qualificação de Perfil",
        description: "Coleta de tamanho da equipe, segmento e volume de conversas",
        systemPromptInstructions: "Faça perguntas consultivas sobre volume de mensagens e dores atuais.",
        nextPossibleStates: ["presentation", "closing", "human_escalated"],
      },
      presentation: {
        name: "Apresentação da Proposta",
        description: "Exposição do plano ideal e benefícios",
        systemPromptInstructions: "Destaque a segurança da API oficial da Meta e os ganhos de produtividade da IA.",
        nextPossibleStates: ["closing", "qualification", "human_escalated"],
      },
      closing: {
        name: "Fechamento",
        description: "Envio de proposta, link de pagamento ou agendamento",
        systemPromptInstructions: "Estimule a tomada de decisão oferecendo link imediato ou teste com garantia de 7 dias.",
        nextPossibleStates: ["completed", "human_escalated"],
      },
    },
  },
};

export const initialUsage: TenantUsage = {
  period: "2026-09",
  metaMessages: {
    freeCustomerCareWindow: 1420, // Inside 24h window ($0 cost!)
    billableTemplateMarketing: 48, // Outside window marketing
    billableTemplateUtility: 12,
  },
  geminiTokens: {
    promptTokens: 485000,
    candidateTokens: 112000,
    totalCostEstimatedUsd: 0.09, // ~$0.09 USD!
  },
};
