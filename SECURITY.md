# Security Policy & Architecture (`SECURITY.md`)

## 1. Overview
The **WhatsApp Sales Hub** platform processes third-party personal data, leads, and customer sales conversations at scale. Security is treated as an absolute architectural requirement with zero exceptions. Every layer of the platform is designed under zero-trust, least-privilege, and defense-in-depth principles.

---

## 2. Mandatory Security Rules & Implementations

### 2.1. Secret Management (Zero Plaintext Secrets)
- **Rule**: No secrets, credentials, or private keys are ever stored in source code, committed files, or plaintext `.env` files.
- **Implementation**: 
  - All sensitive backend secrets (`META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_ACCESS_TOKEN`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are managed via Supabase Vault / Edge Function secrets (`supabase secrets set`).
  - The client dashboard frontend only receives the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, which have zero administrative privileges.
  - Development and CI rely exclusively on mocked payloads or ephemeral test keys.
  - Strict `.gitignore` rules prevent accidental commits of `.env` or credential files.

### 2.2. Webhook Signature Verification (HMAC SHA-256)
- **Rule**: Every HTTP request received at the WhatsApp Cloud API webhook endpoint must be verified against the Meta App Secret before parsing or processing.
- **Implementation**:
  - The raw HTTP request body is evaluated against the `X-Hub-Signature-256` header using HMAC SHA-256 with constant-time equality check to eliminate timing attacks.
  - If the signature is missing, invalid, or malformed, the request is immediately terminated with HTTP `403 Forbidden`.
  - Suspicious requests are logged with timestamp and event metadata only (no body echo).

### 2.3. Postgres Row Level Security (RLS): Deny by Default & Tenant Isolation
- **Rule**: The Postgres database must reject all operations unless an explicit policy permits the authenticated user's tenant.
- **Implementation**:
  - RLS is enabled on all tables: `public.tenants`, `public.tenant_users`, `public.phone_number_index`, `public.contacts`, `public.conversations`, `public.usage`.
  - Strict "deny by default": without an explicit policy, unauthenticated (anon) and unauthorized requests receive empty query results or HTTP 401 / Postgres 42501 error ("new row violates row-level security policy").
  - Tenant scope:
    - Tables `contacts` and `conversations` require `tenant_id in (select tenant_id from public.tenant_users where user_id = (select auth.uid()))`.
    - Cross-tenant read/write attempts are rejected at the Postgres engine level.
    - Server-only tables `phone_number_index` and `usage` have zero client-side policies; they are accessed exclusively by Supabase Edge Functions via `service_role`.
  - Automated tests in `functions/tests/rls.test.ts` execute against Postgres in CI to verify that cross-tenant access and unauthorized writes are strictly blocked with error code 42501. Tests fail loudly if the database is unreachable.

### 2.4. Service Role Isolation & Token Authorization
- **Rule**: Client apps must never possess or execute with `service_role` credentials.
- **Implementation**:
  - Edge Functions authenticate end-user requests via Supabase JWT verification (`auth.uid()`).
  - When Edge Functions operate in backend jobs (e.g., incoming Meta webhook, scheduled proactive recovery), they use `service_role` but strictly resolve `tenant_id` from trusted database lookups (`phone_number_index`) before reading or modifying tenant rows.

### 2.5. Least Privilege & Multi-Tenant Authorization
- **Rule**: Multi-tenant authorization depends on verified membership records in `public.tenant_users`.
- **Implementation**:
  - Supabase Authentication enforces user identity.
  - Role permissions (`admin` vs `agent`) are evaluated through relational constraints and RLS subqueries.

### 2.7. Structured Logging & PII Protection
- **Rule**: Customer messages, personal identifiers, and tokens must never appear in application logs.
- **Implementation**:
  - Structured logging emits only operational telemetry: `tenantId`, `conversationId`, `event`, `status`, `timestamp`.
  - Message bodies, phone numbers, and Gemini prompt details are excluded from Cloud Logging outputs.

### 2.8. Strict CORS Configuration
- **Rule**: No backend endpoint may allow wildcard origins (`*`).
- **Implementation**:
  - All browser-facing HTTPS endpoints enforce explicit CORS white-lists matching the verified production domain and local development emulator origin.

### 2.9. Automated Dependency Auditing
- **Rule**: Automated checks must prevent vulnerable dependencies from entering production.
- **Implementation**:
  - GitHub Dependabot is enabled.
  - CI pipeline executes `npm audit --audit-level=high`, blocking pull requests if high or critical severity vulnerabilities are present.

### 2.10. Webhook Rate Limiting & Denial-of-Service Defense
- **Rule**: Public-facing endpoints must prevent resource exhaustion and billing spikes.
- **Implementation**:
  - Cloud Functions 2nd Gen concurrency and max instance limits are configured to throttle traffic spikes.
  - Webhook payloads exceeding expected sizes are rejected immediately.
