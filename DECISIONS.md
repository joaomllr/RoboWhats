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


