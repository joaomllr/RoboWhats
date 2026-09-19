# WhatsApp Sales Hub

> **Multi-tenant AI-Powered WhatsApp Sales & Customer Support Platform**  
> Built with Supabase (Postgres with Row Level Security, Edge Functions in Deno/TypeScript), Google Gemini (`gemini-2.5-flash` via Google AI Studio), and Meta WhatsApp Cloud API.

---

## 1. Product Overview

**WhatsApp Sales Hub** is a multi-tenant SaaS that transforms a company's WhatsApp into an autonomous, 24/7 sales and lead qualification machine with **zero upfront infrastructure costs**.

### Key Differentials
- **Hybrid AI + State Machine Engine**: Natural language understanding via Gemini combined with a deterministic, configurable state machine per tenant.
- **Real-Time Lead Scoring**: Instant calculation of lead intent (Cold ❄️ / Warm 🌤️ / Hot 🔥) visible as contextual badges directly in the inbox.
- **Proactive Conversation Recovery**: Scheduled re-engagement of stalled conversations (2h-22h) compliant with Meta's free 24-hour customer care window.
- **Modern 3-Column Unified Inbox**: High-performance inbox with funnel stage filters (New Lead, Hot Lead, Customer, Lost), real-time chat view, contact context panel, and AI agent status toggle.
- **Self-Service Onboarding**: Guided wizard with WhatsApp Embedded Signup simulation and instant bot persona setup.
- **Public SaaS Landing Page**: Value proposition showcase, interactive simulator, pricing tiers, and direct conversion funnel into onboarding.
- **Usage & Cost Metering**: Granular per-tenant tracking of Meta message categories and Gemini tokens consumed.
- **Postgres Row Level Security (RLS)**: True relational tenant isolation with "deny by default" policies tested in CI.

---

## 2. Infrastructure & Zero Upfront Costs ($0 Pilot)

The platform is designed to launch with **zero upfront deposit ($0 credit card requirement)**:

| Component | Provider & Tier | Cost |
| :--- | :--- | :--- |
| **Database & Auth** | Supabase Managed Postgres (Free Tier: 500MB, RLS enabled) | **$0.00** |
| **Serverless Engine** | Supabase Edge Functions (Deno / TypeScript, 500k invocations/mo) | **$0.00** |
| **Generative AI** | Google AI Studio Gemini API (`GEMINI_API_KEY`, generous free tier) | **$0.00** |
| **Meta WhatsApp API** | Free customer service replies inside the 24-hour window | **$0.00** |
| **Dashboard Frontend** | Static SPA (Vite + React + Tailwind CSS) | **$0.00** |

---

## 3. Monorepo Structure

```
whatsapp-sales-hub/
├── apps/
│   └── dashboard/              # Self-service dashboard & Landing page (React + Vite + Tailwind CSS)
├── supabase/
│   ├── migrations/             # Postgres DDL migrations with RLS policies
│   └── functions/              # Edge Functions in Deno / TypeScript
│       ├── _shared/            # Shared modules (types, stateMachine, geminiAgent, signature)
│       ├── webhook/            # Meta WhatsApp Cloud API inbound webhook
│       ├── onboard-tenant/     # Self-service tenant creation & number registration
│       └── proactive-recovery/ # Scheduled recovery job for stalled conversations
├── functions/                  # Unit tests & RLS test suite (Vitest)
│   └── tests/
│       ├── signature.test.ts   # Webhook HMAC SHA-256 validation tests
│       ├── stateMachine.test.ts # Agnostic state engine & escalation tests
│       └── rls.test.ts         # Postgres Multi-Tenant RLS isolation tests
├── docs/
│   └── ARCHITECTURE.md         # Full architecture blueprint & relational schema
├── SECURITY.md                 # Security architecture & compliance
├── DECISIONS.md                # Architecture Decision Records (ADR)
├── README.md                   # Product & developer documentation
└── .env.example                # Environment variables template
```

---

## 4. Local Setup & Development

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- Git

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd whatsapp-sales-hub

# Install all dependencies across monorepo workspaces
npm install
```

### Running the Dashboard Locally
```bash
cd apps/dashboard
npm run dev
```
Open `http://localhost:5173` to explore the Landing Page, Onboarding Wizard, and Unified Inbox.

### Running Checks & Tests
```bash
# Run linting across all workspaces
npm run lint

# Run full test suite (signature + state machine + Postgres RLS)
npm run test

# Run RLS tests specifically
npm run test:rules

# Run production build
npm run build
```

---

## 5. Security & Verification

Please consult [`SECURITY.md`](./SECURITY.md) for details on HMAC SHA-256 signature verification, Postgres Row Level Security (RLS), and secret management.

