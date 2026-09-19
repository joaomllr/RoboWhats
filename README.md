# WhatsApp Sales Hub

> **Multi-tenant AI-Powered WhatsApp Sales & Customer Support Platform**  
> Built with Firebase (Firestore, Cloud Functions 2nd Gen, Hosting, Auth, App Check), Google Gemini (`gemini-3.5-flash-lite`), and Meta WhatsApp Cloud API.

---

## 1. Product Overview

**WhatsApp Sales Hub** is a multi-tenant SaaS that transforms a company's WhatsApp into an autonomous, 24/7 sales and lead qualification machine.

### Key Differentials
- **Hybrid AI + State Machine Engine**: Natural language understanding via Gemini combined with a deterministic, configurable state machine per tenant (`tenants/{tenantId}/config/main`).
- **Real-Time Lead Scoring**: Instant calculation of lead intent (Cold ❄️ / Warm 🌤️ / Hot 🔥) visible as contextual badges directly in the inbox.
- **Proactive Conversation Recovery**: Scheduled re-engagement of stalled conversations compliant with Meta's 24-hour window and approved templates.
- **Modern 3-Column Unified Inbox**: High-performance inbox with funnel stage filters (New Lead, Hot Lead, Customer, Lost), real-time chat view, contact context panel, and AI agent status toggle.
- **Self-Service Onboarding**: Guided wizard with WhatsApp Embedded Signup simulation and instant bot persona setup.
- **Public SaaS Landing Page**: Value proposition showcase, interactive demo, pricing tiers, and direct conversion funnel into onboarding.
- **Usage & Cost Metering**: Granular per-tenant tracking of Meta message categories and Gemini tokens consumed.

---

## 2. Expected Initial Costs (Pilot Phase)

The architecture is deliberately engineered to operate at **near-zero cost ($0/month)** during the initial pilot phase:

| Component | Pricing Model & Quotas | Initial Pilot Cost |
| :--- | :--- | :--- |
| **Firebase Hosting** | Free tier: 10 GB storage, 360 MB/day transfer | **$0.00** |
| **Cloud Firestore** | Free tier: 50,000 reads/day, 20,000 writes/day, 1 GB storage | **$0.00** |
| **Cloud Functions (2nd Gen)** | Free tier: 2M invocations/month, 400,000 GB-seconds compute | **$0.00** |
| **Meta WhatsApp Cloud API** | Responses inside the 24h customer care window are **100% free** | **$0.00** |
| **Gemini AI (`gemini-3.5-flash-lite`)** | Capped at 500 maxOutputTokens/turn (~$0.0001 per turn) | **<$0.50/mo** |

> **Note on Firebase Blaze Plan**: The Blaze plan is required solely because Google Cloud restricts Cloud Functions from making outbound network calls to external APIs (Meta Graph API, Gemini) on the free Spark plan. Blaze retains all Spark free quotas and only bills if limits are exceeded. A monthly Google Cloud Budget of **$5.00** with alerts at 50%, 90%, and 100% is configured for safety.

---

## 3. Monorepo Structure

```
whatsapp-sales-hub/
├── apps/
│   └── dashboard/              # Self-service dashboard & Landing page (React 19 + Vite + Tailwind CSS)
├── functions/                  # Cloud Functions 2nd Gen (TypeScript + @google/genai + Admin SDK)
├── firestore.rules             # Strict tenant-isolated security rules (deny by default)
├── firestore.indexes.json      # Composite index definitions
├── firebase.json               # Firebase configuration & emulator ports
├── .firebaserc                 # Project mapping
├── .github/
│   └── workflows/
│       ├── ci.yml              # Monorepo CI: Lint, Typecheck, Unit Tests, Rules Tests, Security Audit
│       └── deploy.yml          # Continuous Deployment to Firebase Hosting & Functions
├── docs/
│   └── ARCHITECTURE.md         # Full architecture blueprint & data models
├── SECURITY.md                 # Security architecture & compliance
├── DECISIONS.md                # Architecture Decision Records (ADR)
├── README.md                   # Product & developer documentation
└── .gitignore                  # Security-first ignore rules
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

### Local Emulation with Firebase Emulator Suite
```bash
# Start Firebase emulators (Firestore, Auth, Functions, Hosting)
npx -y firebase-tools@latest emulators:start
```

- **Emulator UI**: `http://localhost:4000`
- **Dashboard & Landing Dev Server**: `http://localhost:5173`
- **Functions Emulator**: `http://localhost:5001`
- **Firestore Emulator**: `http://localhost:8080`

### Running Checks & Tests
```bash
# Run linting across all packages
npm run lint

# Run unit tests and rules tests
npm run test

# Run build across all workspaces
npm run build

# Check dependency vulnerabilities
npm run audit
```

---

## 5. Security & Verification

Please consult [`SECURITY.md`](./SECURITY.md) for details on HMAC SHA-256 signature verification, App Check enforcement, and Firestore security rules.
