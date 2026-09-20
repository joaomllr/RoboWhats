# Architecture Decision Records (`DECISIONS.md`)

This document records the architectural and technical decisions made during the design and development of **WhatsApp Sales Hub**, following industry best practices.

---

## ADR-001: Monorepo Architecture with npm Workspaces

- **Status**: Accepted
- **Context**: The project consists of a serverless backend (`functions`), a self-service customer dashboard and sales landing page (`apps/dashboard`), along with shared configuration files (`firestore.rules`, `firebase.json`, GitHub Actions).
- **Decision**: Adopt a lightweight npm workspaces monorepo:
  ```
  whatsapp-sales-hub/
  ├── apps/
  │   └── dashboard/
  ├── functions/
  ├── firestore.rules
  └── ...
  ```
- **Consequences**: Single source of truth for version control, unified CI/CD pipelines, coordinated atomic commits, and centralized linting and dependency auditing without the overhead of heavy monorepo tooling like Nx/Turborepo.

---

## ADR-002: Frontend Framework — React + TypeScript + Vite + Tailwind CSS

- **Status**: Accepted
- **Context**: The frontend requires both a high-converting public sales landing page with a simulated subscription checkout and an authenticated self-service dashboard featuring a real-time unified 3-column inbox, interactive analytics, and an onboarding wizard.
- **Decision**: Use **React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons**.
- **Rationale**:
  - Blazing fast build times and Hot Module Replacement (HMR) with Vite.
  - Zero cold-start SSR overhead for Firebase Hosting; static hosting on Firebase's global CDN is included in the free tier.
  - Tailwind CSS provides unified, modern, tokenized styling supporting dark/light mode toggle effortlessly.
  - High ergonomics for real-time Firestore listeners (`onSnapshot`) in client-side React hooks.

---

## ADR-003: Backend Runtime — Firebase Cloud Functions 2nd Generation

- **Status**: Accepted
- **Context**: The backend handles webhook calls from Meta, WhatsApp message processing, AI reasoning, and scheduled conversation recovery crons.
- **Decision**: Use **Firebase Cloud Functions 2nd Generation (Node.js 20+, TypeScript)**.
- **Rationale**:
  - Native integration with Google Cloud Secret Manager via `secrets: [...]` config.
  - Concurrency handling (multiple requests per instance), dramatically reducing cold starts and resource consumption.
  - Fine-grained IAM service accounts per function.
  - Blaze plan free tier covers millions of invocations/month.

---

## ADR-004: Generative AI Model Selection — `gemini-3.5-flash-lite`

- **Status**: Accepted
- **Context**: Every incoming customer WhatsApp message requires natural language understanding, intent extraction, real-time lead qualification (scoring: cold / warm / hot), and contextual response generation within the tenant's brand persona.
- **Decision**: Use **`gemini-3.5-flash-lite`** via the current official **`@google/genai`** SDK, with `maxOutputTokens` capped at 500 tokens per interaction.
- **Rationale**:
  - `gemini-3.5-flash-lite` is Google's ultra-fast, lowest-cost model designed specifically for high-frequency interactive tasks.
  - Near-instant response latency (< 1s), critical for natural WhatsApp conversational pacing.
  - Capping `maxOutputTokens` prevents runaway token generation costs while allowing precise, sales-optimized responses.

---

## ADR-005: Agnostic Hybrid Engine (State Machine + Generative AI)

- **Status**: Accepted
- **Context**: The platform serves multiple distinct business tenants (e.g. real estate, clinics, consultancies, e-commerce) on a single codebase. Hardcoded decision trees fail on natural conversation, while unconstrained LLMs wander off-topic and fail sales funnels.
- **Decision**: Implement a **Hybrid "Structured Workflow + Generative AI" Engine**:
  - The state machine is completely generic and tenant-agnostic.
  - Flow states, transition conditions, required fields, and escalations are stored as data in `tenants/{tenantId}/config/main`.
  - Gemini operates within the boundaries of the active state: it comprehends customer intent, maps answers to transition triggers, extracts entity data, computes lead scores, and crafts in-persona replies without hardcoded customer logic in the codebase.

---

## ADR-006: Strict Multi-Tenant Data Isolation Strategy

- **Status**: Accepted
- **Context**: Multi-tenant SaaS processing confidential customer chats requires bulletproof isolation at database and function levels.
- **Decision**:
  - All tenant resources live under `tenants/{tenantId}/**`.
  - Firestore Security Rules enforce `request.auth.token.tenantId == tenantId` on all reads/writes.
  - A single Meta webhook receives messages for all tenants; it securely looks up `phoneNumberIndex/{phone_number_id} -> { tenantId }` in a protected collection accessible only by the Admin SDK.
  - Cloud Functions validate and scope every write using the resolved `tenantId`.

---

## ADR-007: Official WhatsApp Cloud API Integration

- **Status**: Accepted
- **Context**: Connecting to WhatsApp can be done via unofficial reverse-engineered protocols (Baileys, Puppeteer QR codes) or the official Meta WhatsApp Cloud API.
- **Decision**: Exclusively integrate with the **Official Meta WhatsApp Cloud API**.
- **Rationale**:
  - Zero risk of phone number bans by Meta.
  - Official WhatsApp Embedded Signup enables clients to onboard their business numbers in minutes.
  - 24-hour customer service window provides **free unlimited inbound & outbound responses**.
  - Official templates for compliant proactive reengagement.

---

## ADR-008: Usage Metering Architecture

- **Status**: Accepted
- **Context**: The SaaS plans charge based on active contacts and pass through any extra Meta template or AI token costs.
- **Decision**: Instrument every billable event immediately in `tenants/{tenantId}/usage/{yyyy-mm}`:
  - Meta messages categorized: free 24h window vs. billable template (marketing, utility).
  - Gemini tokens: input prompt tokens and candidate output tokens.
  - Read-only for tenant clients; updated atomically via database increment.

---

## ADR-009: Zero-Upfront-Cost Infrastructure Migration to Supabase & Google AI Studio

- **Status**: Accepted
- **Context**:
  - The initial target was Firebase Blaze + Google Cloud. However, Firebase Blaze requires an upfront credit card deposit, while the free Firebase Spark tier blocks all outbound network calls in Cloud Functions (preventing outbound requests to Meta Graph API and Gemini API).
  - The product owner mandated a launch with **zero upfront cost ($0 card deposit)** while preserving 100% of product capabilities and multi-tenant isolation rigor.
- **Decision**:
  - Migrate the database to **Supabase Managed Postgres** with **Row Level Security (RLS)** as the tenant isolation engine.
  - Migrate serverless functions to **Supabase Edge Functions** (Deno/TypeScript), supporting outbound network calls on the free tier.
  - Call **Google AI Studio Gemini API** using standard API keys (`GEMINI_API_KEY`), which offers an extensive free tier with zero cloud billing requirements.
- **Consequences**:
  - Launch achieved with $0 capital expenditure.
  - Strict multi-tenant isolation enforced at the Postgres database engine level via RLS policies (`contacts_isolated_by_tenant_select`, `tenant_users_can_read_own_membership`, etc.) and tested against Postgres.
  - `phone_number_index` and `usage` tables completely blocked from direct client access via empty RLS policies (accessible exclusively via `service_role` in Edge Functions).

---

## ADR-010: Identidade Visual Fluxi, Arquitetura de Marca e Design Tokens

- **Status**: Accepted
- **Context**:
  - The product transitions from an unbranded standalone tool ("robô de WhatsApp SaaS") to a core catalog offering of **Fluxi**, an umbrella brand encompassing modern web development, business workflow automations, and intelligent conversational agents.
  - End users are Brazilian small and medium businesses (SMBs, clínicas, imobiliárias, e-commerces, prestadores de serviços) who value clarity, confidence, and speed over technical developer jargon.
- **Decision**:
  - **Brand Architecture**:
    - **Mother Brand**: `Fluxi` (Tagline: *"Sites • Automações • WhatsApp Bots"*).
    - **Product Designation**: `Fluxi Bots` (or *"Robô de WhatsApp by Fluxi"*).
    - Mother brand logo with wordmark and product badge displayed prominently in public headers, landing pages, and dashboard navigation.
  - **Design Tokens & Palette**:
    - `--fluxi-blue: #2D5BFF`: Primary brand tone. Applied to navigation headers, badges, highlights, links, and focused interactive states.
    - `--fluxi-green: #00C48C`: Primary action/conversion tone. Exclusively applied to main CTAs, conversion buttons, active operational statuses, and positive sales metrics.
    - `--fluxi-graphite: #1A1D29`: Deep dark base. Applied to primary typography in light mode and dark mode background canvases.
    - `--fluxi-cloud: #F4F6FB`: Clean neutral canvas. Applied to light mode backgrounds and secondary panels.
    - `--fluxi-coral: #FF6B5B`: Urgency/alert accent. Strictly reserved for warnings, system errors, and high-urgency business moments (such as 🔥 *Leads Quentes* requiring immediate sales attention). Never applied as arbitrary decorative coloring.
    - **Channel Accent Isolation**: The native WhatsApp green (`#00D26A`) is strictly isolated to specific WhatsApp channel indicators (e.g. channel badges, chat bubble indicators), ensuring the overall application chrome is unmistakably *Fluxi*.
  - **Tone of Voice**:
    - Direct, confident, and commercial.
    - Strict avoidance of backend/developer jargon in customer-facing views: terminology such as "endpoint", "webhook", "payload", "tenant", "RLS" replaced with user-friendly terms like "conexão", "notificação", "empresa", "isolamento e segurança".
- **Consequences**:
  - Unified aesthetic across landing page, onboarding wizard, inbox, analytics, and bot settings.
  - Strengthened cross-selling potential between Fluxi Bots, Fluxi Sites, and Fluxi Automações.



---

## ADR-011: Reconciliação do 9º dígito brasileiro no envio via Meta Cloud API

- **Status**: Accepted
- **Context**:
  - O pipeline de recebimento (HMAC → roteamento multi-tenant → Gemini) funcionava,
    mas todo envio de resposta falhava com `(#131030) Recipient phone number not in
    allowed list`, mesmo com o destinatário cadastrado e verificado por SMS na lista
    de números de teste da Meta. Só existiam linhas `direction = 'inbound'` em
    `conversations`.
  - O mesmo payload, com o mesmo token, executado manualmente no Graph API Explorer,
    funcionava. Isso levou a hipóteses erradas (token inválido, versão da Graph API,
    app não assinado ao WABA, diferenças do runtime Deno) — todas descartadas.
  - A causa real apareceu comparando o `to` dos dois requests: a Edge Function enviava
    `555181186641` (12 dígitos, forma legada **sem** o 9º dígito), enquanto o teste
    manual bem-sucedido usava `5551981186641` (13 dígitos, **com** o 9).
  - Para celulares brasileiros a Meta entrega `from` e `contacts[0].wa_id` na forma
    legada de 12 dígitos, mas a allowed list de números de teste guarda o número
    exatamente como foi cadastrado no painel (com o 9) e o match é exato. A sandbox
    rejeita a forma de 12 dígitos antes de qualquer normalização.
- **Decision**:
  - `sendWhatsAppMessage` passa o destinatário por `brazilianPhoneVariants()`, que
    gera as duas formas (com e sem o 9º dígito) para números `+55` de celular, e
    tenta a forma **com** o 9 primeiro — aceita tanto pela sandbox quanto por números
    de produção.
  - Em caso de falha especificamente com o código `131030`, tenta a forma alternativa.
    Qualquer outro código de erro interrompe imediatamente, sem retry.
  - Erros de envio logam `to`, `status`, `code` e `fbtrace_id` (nunca o token), para
    correlação com o suporte da Meta.
  - O payload passou a incluir `recipient_type: "individual"` e `text.preview_url`,
    alinhando com o exemplo canônico de `POST /{phone-number-id}/messages`.
- **Consequences**:
  - O envio funciona tanto com número de teste (allowed list, match exato) quanto com
    número de produção, sem depender do formato que a Meta escolher entregar no webhook.
  - O comentário anterior em `webhook/index.ts` — que afirmava o oposto, que `wa_id`
    era a forma exigida para envio — foi corrigido: `wa_id` continua sendo a fonte do
    número, mas quem reconcilia o formato é o `metaSender`.
  - Fica registrado que `#131030` deve ser lido como "formato do destinatário não bate
    com o cadastrado", não como problema de token, versão de API ou runtime.

### Adendo: `#130497` é um bloqueio de conta, não de código

Depois que o `#131030` foi corrigido, a API passou a aceitar o envio (HTTP 200 com
`wamid`), mas as mensagens continuavam não chegando. O motivo só apareceu quando o
webhook passou a logar os callbacks de status da Meta, que chegam **sem** o campo
`messages` e antes caíam no early return em silêncio:

```
status: failed
code: 130497
"Business account is restricted from messaging users in this country."
recipient_id: 555181186641
```

São dois problemas independentes e é importante não confundi-los:

- `#131030` — formato do destinatário não bate com a allowed list. **Resolvido em código.**
- `#130497` — a conta business está restrita de enviar para o país do destinatário.
  **Resolve-se no Meta Business Manager** (Verificação de Negócio, restrições de
  política, países permitidos da WABA). Nenhuma alteração de código muda esse resultado.

O `recipient_id` do callback (`555181186641`, 12 dígitos) confirma que a Meta normaliza
sozinha o número que enviamos com o 9º dígito — ou seja, enviar na forma de 13 dígitos
satisfaz o gate da allowed list sem prejudicar a entrega.

### Causa confirmada do `#130497`: cross-country a partir do número de teste

O número de teste que a Meta provisiona é **americano** (`+1 555 153-4871`,
Phone Number ID `1322904704240693`, WABA `2589390954808409`). O destinatário do
piloto é brasileiro. Isso torna toda resposta uma mensagem **cross-country**, e a
Meta restringe cross-country justamente para Brasil e Indonésia — inclusive após
completar o scaling path.

O que **não** resolve (verificado antes de gastar esforço):

- Verificação de Negócio / CNPJ (Etapa 3). O bloqueio não é de identidade da empresa.
- Trocar token, versão da Graph API ou qualquer coisa no runtime.

O que resolve: **Etapa 2 — Configuração da produção**, registrando um número
brasileiro próprio na WABA. A mensagem passa a ser BR → BR (doméstica) e a
restrição de cross-country deixa de se aplicar.

Lição para sessões futuras: o número de teste da Meta serve para validar o
*recebimento* e o formato das chamadas, mas **não** serve para validar entrega a
destinatários brasileiros. Um `wamid` de sucesso não significa entrega — só o
callback de status diz a verdade.

---

## ADR-012: RLS de `tenant_users` era recursiva e derrubava todas as leituras

- **Status**: Accepted
- **Context**:
  - Ao ligar o dashboard ao Postgres, a primeira query de um usuário autenticado
    falhava. Simulando um login via `set_config('request.jwt.claims', ...)`, **todas**
    as tabelas retornavam o mesmo erro:
    `infinite recursion detected in policy for relation "tenant_users"`.
  - A policy `tenant_users_can_read_own_membership` consultava `public.tenant_users`
    de dentro da própria policy de `tenant_users`. O Postgres reaplica a policy na
    subconsulta e aborta. Como `tenants`, `contacts` e `conversations` também
    consultam `tenant_users`, o erro se propagava para o schema inteiro.
  - Efeito prático: a RLS — apresentada no README como o motor de isolamento
    multi-tenant, "tested in CI" — nunca permitiu uma única leitura autenticada.
    O dashboard não podia ter sido ligado ao banco; quebraria na primeira query.
- **Decision**:
  - A policy passa a ser `using (user_id = (select auth.uid()))`: cada usuário lê o
    próprio vínculo. Não recorre, e faz as demais policies terminarem normalmente.
    É também o que o nome da policy sempre prometeu.
- **Consequences**:
  - Verificado após a correção, como usuário autenticado: `tenant_users`, `tenants` e
    `contacts` retornam 1 linha, `conversations` 13 linhas, e `usage` e
    `phone_number_index` seguem retornando 0 — continuam bloqueadas de propósito
    para o cliente, acessíveis só via `service_role` nas Edge Functions.
  - O isolamento segue intacto; o que mudou foi apenas deixar de recorrer.
  - `functions/tests/rls.test.ts` não pegou isso. Esses testes provavelmente rodam
    com privilégio que ignora RLS — enquanto não forem revistos, o selo de
    "RLS tested in CI" do README é falsa sensação de segurança.

---

## ADR-013: Migração do número de teste para número BR de produção

- **Status**: Draft — aguardando o número físico (chip) para ser finalizado.
- **Context**:
  - O ADR anterior (seção "Causa confirmada do `#130497`") já havia identificado
    a causa raiz: o número de teste da Meta é americano (`+1 555 153-4871`), e
    toda resposta a um destinatário brasileiro é uma mensagem cross-country —
    restrita pela Meta para Brasil e Indonésia, mesmo após completar o scaling
    path. Nenhuma mudança de código, token ou versão de API resolve isso.
  - A decisão de negócio (setembro/2026) foi migrar direto para um número BR
    real de produção, **sem** esperar a Verificação de Negócio (Business
    Verification) e sem precisar de CNPJ.
  - Confirmado (pesquisa de setembro/2026): a Verificação de Negócio é opcional
    desde outubro/2023 e continua assim — ela é exigida apenas para o selo de
    conta oficial e para subir de tier de volume, não para enviar mensagens
    reais. Referência oficial:
    [developers.facebook.com/docs/whatsapp/overview/business-accounts](https://developers.facebook.com/docs/whatsapp/overview/business-accounts).
  - Sem verificação, um número novo opera no Tier 1: 250 conversas
    **iniciadas pela empresa** por período rolante de 24h. Esse limite não se
    aplica a conversas iniciadas pelo cliente — que é o caso de uso deste bot,
    100% reativo. Fonte:
    [developers.facebook.com/docs/whatsapp/messaging-limits](https://developers.facebook.com/docs/whatsapp/messaging-limits).
  - Modelo de cobrança vigente desde julho/2025: mensagens de resposta dentro
    da janela de 24h aberta pelo cliente entram na categoria **"service"**,
    sem custo. Só há cobrança quando o bot inicia uma conversa via template
    fora da janela de 24h (categorias marketing/utility/authentication,
    ~R$0,21–0,35/mensagem — vide tabela vigente). Para o volume atual do
    piloto (dezenas de conversas/mês, todas reativas), o custo esperado é
    próximo de zero. Fonte:
    [developers.facebook.com/documentation/business-messaging/whatsapp/pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing).
  - Bibliotecas não-oficiais (Baileys, whatsapp-web.js, Evolution API) foram
    deliberadamente descartadas: violam os termos do WhatsApp e sofrem ondas
    ativas de banimento em 2026. Inaceitável para um SaaS vendido a clientes
    reais — o risco recairia sobre o cliente final, não sobre nós.
- **Decision**:
  - Registrar um número de telefone brasileiro real (linha dedicada, sem conta
    ativa no app comum do WhatsApp) como número de produção, seguindo o
    roteiro em `docs/MIGRACAO_NUMERO_PRODUCAO.md`.
  - Pular a etapa de Confirmar Empresa / Business Verification neste momento.
  - Novo `phone_number_id`: `<PREENCHER>` (WABA: `<PREENCHER — 2589390954808409 se reaproveitada>`).
  - Data da migração: `<PREENCHER>`.
  - Nenhuma mudança de código foi necessária — confirmado por revisão linha a
    linha de `webhook/index.ts`, `_shared/metaSender.ts` e `_shared/types.ts`
    (ver `docs/MIGRACAO_NUMERO_PRODUCAO.md`, seção 0.1): o roteamento já é
    100% dinâmico via `phone_number_index`. Só a linha nova nessa tabela e o
    secret `META_ACCESS_TOKEN` mudaram.
  - `<PREENCHER: número de teste 1322904704240693 foi mantido ativo para
    desenvolvimento / foi aposentado — decisão tomada em <data>>`.
- **Consequences**:
  - `<PREENCHER após validação end-to-end: confirmação de que uma mensagem
    outbound real foi entregue, sem #131030 nem #130497, e do teste de lead
    "quente" (transição de stage para lead_quente)>`.
  - Quando o volume crescer o suficiente para exigir tier maior ou o selo de
    conta oficial, será necessário completar a Verificação de Negócio. Nesse
    momento, abrir um **MEI** (gratuito, 100% online) é o caminho mais barato
    — a Meta aceita MEI, Contrato Social, extrato bancário empresarial ou
    conta de consumo em nome do negócio, não exclusivamente CNPJ completo.

### Lição aprendida: deploy de Edge Functions via MCP do Supabase

Ao fazer deploy de uma função via `mcp__Supabase__deploy_edge_function`, o
payload precisa incluir **todos** os arquivos do bundle, inclusive os de
`_shared/`, e as referências de import dentro desses arquivos devem usar
`./_shared/...` (relativo ao próprio bundle enviado), não `../_shared/...`
como está no repositório local (onde `_shared/` é irmã de `webhook/`, não
filha). O deploy que corrigiu o `#131030` e o Gemini já seguiu esse padrão;
qualquer deploy futuro da função `webhook` precisa repetir isso, ou a função
sobe sem as dependências e quebra em runtime.
