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

- **Status**: Draft — decisões de escopo confirmadas (19/set/2026); falta o
  número físico (chip) e a validação end-to-end para fechar.
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
  - Reaproveitar a WABA (`2589390954808409`) e o tenant de teste
    (`Fluxi - Tenant de Teste`) já existentes — sem WABA nem tenant separados
    (decisão confirmada em 19/set/2026).
  - Manter o número de teste (`1322904704240693`) ativo para desenvolvimento
    depois que o número de produção estiver no ar — as duas linhas convivem
    em `phone_number_index`, sem custo nem risco adicional (decisão
    confirmada em 19/set/2026).
  - Novo `phone_number_id`: `<PREENCHER>`.
  - Data da migração: `<PREENCHER>`.
  - Nenhuma mudança de código foi necessária — confirmado por revisão linha a
    linha de `webhook/index.ts`, `_shared/metaSender.ts` e `_shared/types.ts`
    (ver `docs/MIGRACAO_NUMERO_PRODUCAO.md`, seção 0.1): o roteamento já é
    100% dinâmico via `phone_number_index`. Só a linha nova nessa tabela e o
    secret `META_ACCESS_TOKEN` mudaram.
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

---

## ADR-014: Revisão completa do projeto — segurança, dívida de testes, CI

- **Status**: Accepted
- **Context**:
  - A pedido explícito ("reveja todo o projeto novamente e ajuste o que julgar
    necessário"), foi feita uma varredura de tudo que ainda não tinha sido
    revisado nesta sessão: `onboard-tenant`, `proactive-recovery`, o diretório
    `functions/` (paralelo a `supabase/functions/`), os workflows de CI/CD e
    o `SECURITY.md`. A varredura encontrou problemas reais, não cosméticos.
- **Achados e correções**:
  1. **`proactive-recovery` deployada com `verify_jwt: false` e sem nenhuma
     autenticação própria.** Qualquer pessoa que descobrisse a URL podia
     disparar envios reais de WhatsApp para contatos reais, sem limite,
     gastando cota de Meta/Gemini. Corrigido com um segredo compartilhado
     (`PROACTIVE_RECOVERY_SECRET`, header `x-recovery-secret`), fail-closed —
     a função responde 500 se o secret não estiver configurado, nunca abre
     em silêncio. **Pendente: o segredo precisa ser configurado via
     `supabase secrets set` (não há tool de MCP para isso) — a função fica
     inoperante, não insegura, até lá.**
  2. **`proactive-recovery` derrubava o lote inteiro se um único envio
     falhasse.** Cada contato agora tem seu próprio try/catch.
  3. **`proactive-recovery` reenviaria o mesmo nudge indefinidamente** para
     qualquer contato parado, a cada execução, se o cliente nunca respondesse
     — risco de spam e de violação de política de qualidade de mensageria da
     Meta. Corrigido: só reengaja se a última mensagem da conversa for nossa
     E o cliente nunca tiver respondido desde então (checagem por
     `direction` da última linha de `conversations`).
  4. **`onboard-tenant` confiava num `userId` arbitrário enviado no corpo da
     requisição** para decidir quem vincular como admin do tenant novo — sem
     nenhuma verificação de que o chamador era de fato aquele usuário. Uma
     chave anon (pública, já exposta no bundle do dashboard) bastava para
     passar pelo `verify_jwt: true` da plataforma sem provar identidade
     nenhuma. Corrigido: o `userId` agora vem exclusivamente de
     `auth.getUser()` sobre o header `Authorization` do próprio chamador.
  5. **Números de telefone em texto puro nos logs**, nos diagnósticos
     adicionados durante o diagnóstico do `#131030`/`#130497` — violando a
     própria política descrita no `SECURITY.md`. Mascarados para os últimos
     4 dígitos (`maskPhone()` em `metaSender.ts`; `recipient_id` redigido em
     `webhook/index.ts`).
  6. **`functions/tests/signature.test.ts` e `stateMachine.test.ts` testavam
     uma implementação Firebase-era completamente diferente** da que roda em
     produção (`functions/src/*`, com APIs e formatos de config distintos —
     função síncrona vs. assíncrona, `BotConfig` aninhado vs. `BotConfigData`
     plano, motor de state-graph completo vs. transição simples). Passavam
     verde no CI sem testar uma linha de código real. Reescritos para
     importar e testar `supabase/functions/_shared/*` diretamente; os 21
     testes passam contra a implementação real.
  7. **`functions/tests/rls.test.ts` só testava o lado "negar" da RLS**
     (cliente anônimo não vê nada) e nunca autenticou como usuário real — o
     ponto cego exato que deixou passar a recursão infinita do ADR-012.
     Adicionada uma suíte que fabrica dois tenants e dois usuários reais via
     Admin API e prova as duas metades que faltavam: um usuário autenticado
     consegue ler os próprios dados e não consegue ler nem escrever nos de
     outro tenant. Verificado manualmente via SQL direto contra o banco real
     (7/7 asserções corretas) antes de confiar na reescrita — a suíte em si
     não pôde ser executada de ponta a ponta neste ambiente porque o proxy de
     rede do sandbox bloqueia `nsotmdvalhcqrigepkcu.supabase.co` para
     bibliotecas HTTP comuns (mesma restrição que impediu testar a migração
     do Gemini e o `curl` no `proactive-recovery`). **Pendente: a suíte
     autenticada exige `SUPABASE_SERVICE_ROLE_KEY` como secret do GitHub
     Actions — sem isso, ela pula os próprios testes de propósito (nunca
     falha por engano) e avisa no output.**
  8. **`functions/src/*` era uma implementação Firebase-era inteira,
     abandonada e nunca removida** (`firebase-admin`, `firebase-functions`,
     `@google/genai`, `cors`, `zod`, `@firebase/rules-unit-testing` como
     dependências), responsável por boa parte das 23 vulnerabilidades
     (1 crítica) que `npm audit` apontava. Removida por completo; `npm audit
     --omit=dev --audit-level=high` agora reporta 0.
  9. **CI estava vermelho desde pelo menos o commit `4ce6fa4`** — toda
     execução em `main` falhava porque `@supabase/supabase-js@2.116+` exige
     Node 22+ (o módulo `realtime-js` precisa de um `WebSocket` nativo,
     ausente no Node 20) e `ci.yml`/`deploy.yml` fixavam Node 20. Corrigido
     bumpando os dois workflows para Node 22. Isso não foi causado por nada
     desta sessão — é uma falha pré-existente da base, confirmada olhando o
     histórico de execuções do CI em `main` antes de mexer em qualquer coisa.
  10. **`SECURITY.md` fazia afirmações que não correspondiam ao código**:
      dizia que toda Edge Function autentica via `auth.uid()` (falso para
      `onboard-tenant`, que confiava em input do cliente, e para
      `proactive-recovery`, que não tinha autenticação nenhuma); dizia que
      telefones nunca aparecem em log (falso, ver item 5); dizia que o CI
      roda `npm audit` bloqueando PRs (o script existia, nenhum workflow o
      chamava); descrevia limites de "Cloud Functions 2nd Gen", um resquício
      do design original em Firebase, abandonado. Corrigido para refletir a
      arquitetura e o comportamento reais, incluindo os dois incidentes
      registrados (a recursão de RLS do ADR-012, o vazamento de telefone
      deste ADR) como parte do próprio histórico de segurança do documento,
      em vez de apagados da memória institucional.
  11. `.github/workflows/deploy.yml` fazia deploy de `proactive-recovery`
      **sem** `--no-verify-jwt` — o próximo deploy automático (contingente a
      `SUPABASE_ACCESS_TOKEN` existir como secret) reverteria silenciosamente
      a correção do item 1, exigindo um JWT de usuário Supabase que um
      cron/scheduler nunca teria. Corrigido para incluir a flag.
- **Consequences**:
  - Duas configurações manuais ficam pendentes, fora do alcance de qualquer
    ferramenta disponível nesta sessão: o secret `PROACTIVE_RECOVERY_SECRET`
    no Supabase (`supabase secrets set`) e `SUPABASE_SERVICE_ROLE_KEY` como
    secret do GitHub Actions (para a suíte de RLS autenticada rodar em vez de
    pular). Nenhuma delas bloqueia o restante do sistema — ambas falham
    fechado (função inoperante / teste pulado), nunca abertas.
  - `functions/` deixou de ter runtime próprio — hoje é só a suíte de testes
    que exercita `supabase/functions/_shared/*` e o Postgres real. Isso é
    intencional: qualquer lógica de negócio nova deve nascer direto em
    `supabase/functions/`, nunca duplicada aqui.
  - O `SECURITY.md` agora documenta os dois incidentes reais encontrados
    nesta sessão (recursão de RLS, telefones em log) como parte do histórico
    do documento — decisão deliberada de manter a memória institucional em
    vez de reescrever a história como se o sistema sempre tivesse sido assim.

---

## ADR-015: Webhook silencioso desde 19/set — token de teste vencido + número banido

- **Status**: Accepted
- **Context**:
  - O usuário reportou que o webhook parou de receber qualquer `POST` da Meta
    às 23:26:34 UTC de 19/set, mesmo com mensagens de teste reais enviadas
    depois. `function_edge_logs` confirmou: nenhum request de nenhum tipo
    (nem handshake `GET`, nem `POST`) chegou depois desse horário — nem
    mesmo às versões da function deployadas depois (v15–v18), o que já
    descartava qualquer regressão de código deste PR como causa.
  - Este ambiente sandboxed não alcança `graph.facebook.com` nem a própria
    URL do webhook no Supabase (proxy bloqueia ambos, confirmado por `curl`
    retornando `CONNECT tunnel failed, 403`). Não havia como testar
    diretamente a partir daqui.
  - Solução: um endpoint de diagnóstico read-only temporário foi adicionado a
    `webhook/index.ts` (`GET ?diag=status`, gate reaproveitando o
    `META_WEBHOOK_VERIFY_TOKEN` existente — nenhum secret novo criado). Ele
    chama `/{waba_id}/subscribed_apps` e `/{phone_number_id}` na Graph API
    usando o `META_ACCESS_TOKEN` já configurado, e devolve status HTTP +
    corpo truncado de cada um. Nunca loga nem retorna o token. Deployado como
    v19 e testado pelo usuário (fora deste sandbox, via navegador).
  - Primeira rodada do diagnóstico revelou a causa raiz nº 1: o
    `META_ACCESS_TOKEN` configurado era o token temporário de 24h do painel
    "API Setup", que havia expirado (`"Session has expired on Saturday,
    19-Sep-26 17:00:00 PDT"`) — batendo quase exatamente com o horário em que
    o webhook silenciou.
  - O usuário então criou um **System User** no Meta Business Suite, atribuiu
    a WABA de teste e o app a ele, e gerou um token de acesso permanente
    (sem expiração de 24h) com `whatsapp_business_messaging` e
    `whatsapp_business_management`. Configurado via `supabase secrets set`
    rodado pelo próprio usuário no terminal dele — o valor nunca passou por
    esta conversa.
  - Segunda rodada do diagnóstico, já com o token novo: `subscribedApps`
    voltou `200`/`ok: true` (app segue inscrito na WABA), mas
    `phoneNumberStatus` voltou `200`/`ok: true` com o campo
    `"status":"BANNED"` — o número de teste (`1322904704240693`) está banido
    pela Meta. Plausivelmente consequência das rejeições repetidas por
    `#131030`/`#130497` documentadas no ADR-011/PR #1, que podem ter
    acionado um bloqueio automático de abuso em número de teste.
  - **Dois incidentes de exposição de token durante o processo**: em ambos os
    casos o usuário colou um valor de token em texto puro nesta conversa.
    Nenhum dos dois foi usado por esta sessão. O primeiro era o próprio
    `META_ACCESS_TOKEN` a ser configurado — o usuário confirmou tê-lo
    revogado e gerado outro antes de prosseguir. O segundo era um token
    *diferente*, do gerador de teste de 24h da tela "API Setup" (não o token
    permanente do System User já validado) — o usuário confirmou não haver
    relação com o secret configurado no Supabase, mas foi orientado a
    revogá-lo (botão "Gerar novo token") por precaução.
- **Decision**:
  - Token de 24h não é uma configuração viável para produção — é
    exclusivamente o gerador de teste do painel "API Setup". A migração para
    o número BR de produção (ADR-013) já previa gerar um token no contexto
    do número novo; fica reforçado que esse token deve ser um token de
    **System User de longa duração**, nunca o de 24h.
  - Número de teste banido não é recuperável via código nem via troca de
    token. Decisão do usuário: não tentar apelar o banimento — seguir direto
    para a ativação do número BR de produção já documentada em
    `docs/MIGRACAO_NUMERO_PRODUCAO.md`, que resolve o banimento e a restrição
    cross-country (`#130497`) de uma vez.
  - O endpoint `?diag=status` permanece em produção por ora — só será
    removido (commit separado) depois que o fluxo real de ponta a ponta for
    validado com o número novo, sem depender dele nem do número banido.
- **Consequences**:
  - Migração para o número BR de produção (ADR-013) deixou de ser só uma
    melhoria de roteamento — é agora o único caminho para o sistema voltar a
    funcionar de ponta a ponta. Passo a passo aguardando o usuário resolver a
    checklist de compra/ativação do chip (`docs/MIGRACAO_NUMERO_PRODUCAO.md`,
    seção 0.3).
  - Nenhuma mudança de código de negócio foi necessária para diagnosticar ou
    corrigir a causa raiz — reforça a conclusão do ADR-013 (seção 0.1) de que
    o sistema já era agnóstico ao `phone_number_id`/token específico.

---

## ADR-016: Publicação do dashboard via Cloudflare Workers (Static Assets), não Pages

- **Status**: Accepted
- **Context**:
  - O dashboard (`apps/dashboard`) é uma SPA estática (Vite + React), sem
    necessidade de runtime de servidor. Faltava decidir como publicá-la.
  - A conta Cloudflare do usuário já hospeda outros projetos (`rm-express`,
    `crm-prospeccao-frontend`) como **Workers com Static Assets**, não como
    Cloudflare Pages — confirmado via `workers_list`. A documentação oficial
    da Cloudflare (consultada nesta sessão) também trata Pages como o
    caminho legado, com Workers Static Assets como o recomendado para sites
    novos.
  - As ferramentas MCP disponíveis para Cloudflare neste ambiente cobrem
    D1/KV/R2/Hyperdrive/leitura de Workers, mas não incluem deploy/criação de
    Worker — só é possível publicar via `wrangler` (CLI) autenticado, ou via
    integração Git ("Workers Builds"). O `wrangler` deste sandbox não está
    autenticado (`wrangler whoami` confirma), e não há como autenticá-lo sem
    ou pedir para o usuário rodar `wrangler login` localmente, ou colar um
    API token nesta conversa — a segunda opção repete exatamente o problema
    de exposição de credencial do ADR-015.
- **Decision**:
  - Publicar via **Workers Builds** (integração Git nativa da Cloudflare):
    o usuário conecta o repositório pela própria interface do painel
    Cloudflare, sem nenhum token passar por este ambiente ou por esta
    conversa. Documentado passo a passo no README (seção "Deploying the
    Dashboard").
  - Adicionado `apps/dashboard/wrangler.jsonc` configurando
    `assets.directory: "./dist"` e
    `assets.not_found_handling: "single-page-application"` (necessário para
    uma SPA com rotas client-side não cair em 404 num reload). Validado
    localmente com `npm run build` + `wrangler dev`: raiz e uma rota interna
    arbitrária retornam `200`.
  - As duas variáveis de build (`VITE_SUPABASE_URL`,
    `VITE_SUPABASE_PUBLISHABLE_KEY`) são públicas — os mesmos valores já
    hardcoded em `ci.yml`/`deploy.yml` — e vão diretas na configuração de
    build do Workers Builds, sem risco de exposição.
- **Consequences**:
  - Falta só a ação manual do usuário no painel Cloudflare (import do
    repositório, 4 campos de configuração) para o deploy automático em
    `main` passar a valer. Nenhuma ferramenta disponível nesta sessão pode
    fazer essa parte por mim.
  - Uma vez conectado, todo push em `main` que toque `apps/dashboard/**`
    republica automaticamente — mesmo padrão já em uso nos outros projetos
    Cloudflare do usuário.

---

## ADR-017: Modelo de Contratação e Cobrança

- **Status**: Accepted — decisões de produto confirmadas; integração real de
  pagamento ainda **não implementada** (ver Consequences).
- **Context**:
  - Uma auditoria manual do fluxo publicado (`robowhats-dashboard.muulej.workers.dev`,
    clique por clique num navegador real) encontrou uma contradição: o CTA do
    herói ("Começar Agora com 7 Dias Grátis") pula direto para um modal de
    cobrança do Plano PRO, sem o cliente escolher nada — enquanto a própria
    seção "Planos & Preços" da mesma landing lista 3 planos com botões
    individuais. O usuário confirmou não ter ainda decidido, na prática, como
    a contratação deveria funcionar.
  - O modal de checkout existente é inteiramente uma simulação visual — campo
    de cartão desabilitado com texto fixo, "Nenhuma cobrança real será
    realizada" — sem gateway de pagamento, tabela de assinatura, ou qualquer
    enforcement de acesso por status de pagamento.
  - `BotConfigManager` (tela "Configuração IA") não tem nenhuma restrição por
    `plan_tier` — confirmado por leitura do componente. As diferenças
    listadas na landing entre Starter/Pro/Scale (ex: "IA com a personalidade
    da sua marca" exclusiva do Pro/Scale) são hoje só texto de marketing, sem
    correspondência no código.
- **Decision** (uma pergunta de cada vez, com recomendação baseada em prática
  de mercado — trial-with-card, dunning, dois dos maiores frameworks de
  billing SaaS hoje):
  1. **Trial pede cartão antecipado** ("trial with card"), com cobrança
     automática no dia 7 caso o cliente não cancele antes. Justificativa:
     benchmarks de conversão de mercado (ProfitWell/Paddle) mostram trials
     com cartão convertendo tipicamente 50–60%+ contra 15–25% sem cartão; o
     onboarding da Fluxi já exige esforço real (conectar WhatsApp de
     verdade), então quem chega até o fim já é um lead qualificado. O modal
     de checkout precisa deixar isso explícito na tela ("Você não será
     cobrado agora. Em 7 dias, cobraremos R$ X/mês, a menos que cancele.") —
     hoje ele não diz isso em lugar nenhum.
  2. **Provedor de pagamento: Mercado Pago** (API de Assinaturas/`preapproval`).
     Justificativa: cliente-alvo é PME brasileira; Mercado Pago tem a melhor
     cobertura de meios de pagamento locais (Pix, boleto, cartão nacional) e
     é o mais reconhecido pelo público-alvo. Stripe é tecnicamente mais
     maduro mas cobra em USD por padrão e tem penetração menor em Pix.
     - **Tipo de conta**: confirmado na documentação oficial
       ([Pré-requisitos — Assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/requirements))
       que a API de Assinaturas não exige CNPJ — só uma conta vendedor
       Mercado Pago, que pode ser CPF. **Decisão: começar com CPF para
       testar a integração agora; usuário avalia abrir MEI depois**, antes
       de cobrar de clientes pagantes de verdade — não por exigência do
       Mercado Pago, mas por nota fiscal (clientes B2B vão precisar dela
       para lançar como despesa) e enquadramento tributário de receita
       recorrente (o mesmo caminho de MEI já registrado no ADR-013 para a
       Verificação de Negócio da Meta).
  3. **Dados de cartão nunca tocam o backend da Fluxi.** Tokenização
     client-side via Mercado Pago Checkout Bricks — o formulário de cartão
     roda no navegador do cliente e manda o dado direto para o Mercado Pago;
     o backend só recebe um token/ID de cliente de volta. Mantém a Fluxi
     fora do escopo pesado de PCI-DSS (nível SAQ A). Esta é uma regra
     arquitetural obrigatória para a implementação futura, não uma
     recomendação opcional.
  4. **Cliente cadastrado manualmente pelo admin (Parte 3) é um caminho
     separado do onboarding público.** Não força cartão nem checkout — o
     admin define `plan_tier`/`status` diretamente, como uma venda
     assistida/negociada (padrão comum em B2B SaaS para contas
     enterprise/cortesia/beta).
  5. **Momento de escolha do plano**: o CTA do herói passa a rolar até a
     seção "Planos & Preços" em vez de abrir o modal do Pro direto — remove
     a contradição descrita no Context. Os botões individuais de cada plano
     continuam abrindo o checkout com o plano certo pré-selecionado (já
     funcionam assim hoje).
  6. **Fim do trial sem pagamento ou falha de cobrança**: tentativa de
     cobrança no dia 7 → sucesso mantém `active`; falha ou ausência de
     tentativa move para um estado equivalente a `past_due` com aviso
     automático ao cliente e **2 dias de carência** antes de mover para
     `suspended` de fato (reduz churn involuntário por cartão vencido —
     prática padrão de dunning do mercado, ex: Stripe Smart Retries).
     Enquanto `suspended`, o `webhook` para de processar mensagens novas
     daquele tenant (mesma checagem de status que a função "Pausar cliente"
     do admin, Parte 3, vai usar — uma implementação serve os dois casos) —
     mensagens recebidas continuam sendo registradas, só não geram resposta
     automática.
  7. **Cancelamento durante o trial** (nenhuma cobrança ainda ocorreu):
     suspende imediatamente.
  8. **Cancelamento como assinante já pagante**: mantém `active` até o fim
     do período já pago, só então move para `cancelled` sem tentar cobrar de
     novo — padrão universal de serviços por assinatura (Netflix, Spotify,
     etc.); cortar na hora equivaleria a um reembolso parcial não devolvido.
  9. **Diferenças reais de funcionalidade entre planos permanecem apenas
     texto de marketing por enquanto** — não serão implementadas como
     enforcement técnico nesta rodada. Justificativa: não há ainda nenhum
     cliente pagante real; construir restrição por plano antes de validar o
     próprio modelo de cobrança é otimizar para um problema que não existe
     ainda, com alto risco de retrabalho assim que os planos forem
     revisados. Registrado aqui como dívida técnica conhecida e consciente,
     não como omissão.
- **Consequences**:
  - Item 5 é a única mudança de código que sai desta rodada (correção do
    item 1.4 do relatório de UX) — CTA do herói + explicitação dos termos de
    cobrança no modal existente.
  - Itens 1–4 e 6–8 descrevem um modelo já decidido, mas **cuja infraestrutura
    ainda não existe**: não há integração real com Mercado Pago, tabela de
    assinatura/fatura no Supabase, Edge Function de webhook de pagamento, nem
    checagem de status de assinatura no roteamento multi-tenant do
    `webhook/index.ts`. Construir isso é um trabalho à parte, maior que uma
    correção de UX, e depende de credenciais do Mercado Pago (Access
    Token/Public Key) que o usuário ainda precisa gerar e configurar como
    secret do Supabase — seguindo o mesmo padrão de nunca passar o valor em
    texto puro pelo chat (ver incidentes de exposição de token no ADR-015).
  - Quando essa infraestrutura for construída, a função "Pausar cliente" da
    Parte 3.2 e a suspensão automática por inadimplência do item 6 devem
    compartilhar a mesma checagem de status no `webhook/index.ts` — não
    implementar como dois mecanismos paralelos.

---

## ADR-018: Área de Administrador da Fluxi + Configuração IA deixa de ser cosmética

- **Status**: Accepted
- **Context**:
  - Não existia nenhum conceito de "admin da Fluxi" (dono da plataforma) no
    schema — `tenant_users.role = 'admin'` é só admin *daquele tenant
    específico*. Confirmado com o usuário: identidade separada, nova tabela
    `platform_admins` (não lista fixa de e-mails no código).
  - Achado ao investigar como o admin reaproveitaria o formulário de
    "Configuração IA" (pedido explícito do usuário): **a tela nunca foi
    persistida em lugar nenhum**. `BotConfigManager` só vivia em `useState`
    local no `App.tsx`; `handleSaveConfig` fazia `setBotConfig(...)` e
    parava aí. Pior — `webhook/index.ts` chamava `runGeminiAgent(...)` sem
    nunca passar `config`, então o bot sempre respondia com o
    `defaultBotConfig` genérico de `_shared/stateMachine.ts`, **para
    qualquer tenant**, independente do que estivesse salvo (ou não) no
    painel. O mesmo valia para `checkHumanEscalation()`, chamada sem
    `config` — as palavras-chave de transbordo configuradas por um tenant
    nunca eram realmente usadas. Reaproveitar esse componente pro admin só
    fazia sentido depois de consertar isso — senão seria duplicar uma tela
    que não muda nada de verdade.
- **Decision**:
  - **`platform_admins`** (migração `20260921000000_...`): tabela mínima
    `user_id -> auth.users`, RLS só permite ler a própria linha (uso
    client-side: mostrar/esconder o link "Painel Admin"). Autorização real
    nunca depende disso sozinho — sempre reconferida server-side.
  - **`bot_configs`** (mesma migração): uma linha por tenant, no formato
    exato de `_shared/stateMachine.ts`'s `BotConfigData` — o webhook lê
    direto, sem mapeamento. RLS deixa cada tenant ler/escrever a própria
    linha (mesmo padrão de escrita direta já usado em `contacts`/
    `conversations` neste projeto — não é uma regra deste código exigir RPC
    para tudo). `webhook/index.ts` agora carrega essa linha antes do turno
    de IA e da checagem de escalação, com fallback pro `defaultBotConfig`
    quando o tenant ainda não configurou nada (comportamento idêntico ao
    anterior nesse caso — nada quebra para tenants existentes).
  - **`tenant_status_history`**: auditoria de toda mudança de status
    (pausar/cancelar/reativar pelo admin, e a suspensão automática por
    inadimplência do ADR-017 quando existir) — sem policy de cliente, só o
    Edge Function novo escreve/lê.
  - **`admin-console`** (Edge Function nova, `service_role` +
    `auth.getUser()` + checagem de `platform_admins`, mesmo padrão de
    autenticação do `onboard-tenant`): `list_tenants`, `get_tenant_detail`,
    `create_tenant`, `update_tenant_status`, `save_tenant_bot_config`. Opera
    cross-tenant de propósito — por isso passa longe de RLS (que isola por
    definição) e centraliza a autorização num único ponto server-side, igual
    ao resto do projeto faz para operações que não são "o próprio usuário
    mexendo no próprio tenant".
  - Primeira Edge Function deste projeto de fato chamada pelo navegador
    (`onboard-tenant` nunca chegou a ser invocada pelo frontend —
    confirmado por busca no código; o onboarding público ainda é 100%
    simulado). Por isso ganhou CORS com allowlist explícita
    (`_shared/cors.ts`) em vez de wildcard, cumprindo o que `SECURITY.md`
    2.8 já prometia sem nunca ter sido posto à prova.
  - **Cadastro manual do cliente pelo admin não cria um login para ele**
    nesta rodada — só `tenants` + `phone_number_index` (opcional, pode ficar
    em branco até o número físico existir) + `bot_configs`. Dar acesso de
    login ao cliente fica como próximo passo separado, fora do escopo do que
    foi pedido ("replicar os mesmos ajustes de configuração", não o convite
    de conta).
  - `/admin` não é uma rota de URL real — este app não usa react-router (é
    inteiramente `currentView` em estado), então a "rota protegida" é um
    valor a mais de `currentView`, gateado por `isPlatformAdmin` (lido da
    própria tabela) e reforçado de verdade no Edge Function. Manter
    consistência com a arquitetura existente em vez de introduzir roteamento
    novo só para esta tela.
  - Admin cadastrado nesta sessão: `jmullerwk@outlook.com` (confirmado com o
    usuário — já era o admin do tenant de teste usado durante toda a sessão).
- **Consequences**:
  - "Configuração IA" agora afeta de verdade o comportamento do bot em
    produção — inclusive pra tenants que já existiam antes desta mudança
    (fallback preserva o comportamento anterior até alguém salvar uma config
    real).
  - A tela de admin não pôde ser validada de ponta a ponta neste ambiente:
    o sandbox não alcança a URL do Supabase nem o Google/Meta (mesma
    limitação de rede de todo o resto da sessão). Build, typecheck e o fluxo
    de demonstração (sem login) foram validados via Playwright headless; o
    fluxo real (login como `jmullerwk@outlook.com`, listar/criar/pausar
    cliente) precisa ser testado pelo usuário no dashboard publicado.
  - `verify_jwt: true` no `admin-console` (diferente de `webhook`/
    `proactive-recovery`, que precisam de `--no-verify-jwt` por não terem
    chamador com sessão Supabase) — aqui o chamador é sempre um usuário
    logado de verdade, então a verificação de JWT da própria plataforma some
    a mais uma camada, sem custo. Se o preflight CORS (`OPTIONS`) esbarrar
    nisso na prática (gateway do Supabase rejeitando antes mesmo do
    `_shared/cors.ts` rodar), a correção é trocar para
    `--no-verify-jwt`, já que a autenticação real já é feita manualmente
    dentro da função de qualquer forma.
