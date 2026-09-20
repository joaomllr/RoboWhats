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
  - Automated tests in `functions/tests/rls.test.ts` execute against Postgres in CI:
    - An anonymous client is denied read and write on every tenant-scoped table (sections 1–3 of the suite).
    - A real authenticated user (created via the Admin API, section 5) can read their own tenant's rows and is denied both read and write on a second tenant's rows — the actual cross-tenant isolation claim, not just anonymous denial.
    - Tests fail loudly if the database is unreachable.
  - **Incident on record**: an earlier version of `tenant_users_can_read_own_membership` queried `tenant_users` from within its own policy, causing Postgres to detect infinite recursion and reject *every* authenticated read on *every* table — the deny-by-default state was accidentally deny-by-breakage instead. The anonymous-only test suite in place at the time could not have caught this: the broken policy only applies `to authenticated`, so an anon client never exercised it. Fixed in migration `20260920000000_fix_tenant_users_rls_recursion.sql`; section 5 of the test suite exists specifically to catch a regression of this class.

### 2.4. Service Role Isolation & Token Authorization
- **Rule**: Client apps must never possess or execute with `service_role` credentials.
- **Implementation**:
  - The dashboard authenticates end-user requests via Supabase JWT verification and RLS (`auth.uid()`) — never `service_role`.
  - Edge Functions run with `service_role` (they need to write across tenants), but each authenticates its *caller* by the mechanism appropriate to who that caller actually is — there is no single uniform check across all three:
    - `webhook`: the caller is Meta, not a Supabase user. Authenticated by HMAC signature (2.2), and `tenant_id` is resolved from the trusted `phone_number_index` lookup, never from client input.
    - `onboard-tenant`: the caller is a logged-in dashboard user. The function verifies their `Authorization` header against Supabase Auth (`auth.getUser()`) and links *that* verified user as tenant admin — a client-supplied `userId` field is never trusted for this. (An earlier version accepted `userId` directly from the request body with no verification at all, letting any caller link an arbitrary user as admin of a new tenant; fixed together with this document.)
    - `proactive-recovery`: the caller is a scheduler/cron, which holds no Supabase session at all. Authenticated by a shared secret (`PROACTIVE_RECOVERY_SECRET`) checked against a request header, fail-closed if the secret isn't configured. (Previously deployed with no authentication of any kind — anyone who found the URL could trigger real WhatsApp sends against real contacts on demand.)

### 2.5. Least Privilege & Multi-Tenant Authorization
- **Rule**: Multi-tenant authorization depends on verified membership records in `public.tenant_users`.
- **Implementation**:
  - Supabase Authentication enforces user identity.
  - Role permissions (`admin` vs `agent`) are evaluated through relational constraints and RLS subqueries.

### 2.7. Structured Logging & PII Protection
- **Rule**: Customer messages, personal identifiers, and tokens must never appear in application logs in a form that identifies the customer.
- **Implementation**:
  - Message bodies and Gemini prompt/response content are never logged.
  - Phone numbers are masked to their last 4 digits (`maskPhone()` in `metaSender.ts`; inline redaction of `recipient_id` in `webhook/index.ts`'s status-callback log) before reaching any log line — enough to correlate a log entry with a support ticket, not enough to identify the customer from the log alone. An earlier diagnostic pass logged full phone numbers in cleartext while root-causing a delivery bug; fixed together with this document.
  - Tokens and secrets are never logged, including in error paths (Meta/Gemini API error bodies are logged, but these do not echo back the credentials used to make the request).

### 2.8. Strict CORS Configuration
- **Rule**: No backend endpoint may allow wildcard origins (`*`).
- **Implementation**:
  - All browser-facing HTTPS endpoints enforce explicit CORS white-lists matching the verified production domain and local development emulator origin.

### 2.9. Automated Dependency Auditing
- **Rule**: Automated checks must prevent vulnerable dependencies from entering production.
- **Implementation**:
  - CI pipeline executes `npm audit --omit=dev --audit-level=high` as an explicit step (`ci.yml`, "Dependency Audit"), failing the build if a high or critical severity vulnerability is present in a production dependency. This was previously defined only as an `npm run audit` script that no workflow ever invoked — the check existed on paper but never ran. It runs today because the Firebase-era dependencies (`firebase-admin`, `firebase-functions`, `@firebase/rules-unit-testing`) that accounted for most of the flagged vulnerabilities were dead code, deleted rather than patched.

### 2.10. Request Size & Abuse Limits
- **Rule**: Public-facing endpoints must prevent resource exhaustion and billing spikes.
- **Implementation**:
  - Supabase Edge Functions (Deno Deploy) enforce their own platform-level request size and concurrency limits; there is no application-level request-size check in `webhook/index.ts` today, so this section previously overstated what the code does — it described "Cloud Functions 2nd Gen" limits from the project's original Firebase-based design, which was abandoned before this document was last substantively reviewed.
  - `proactive-recovery` cannot be triggered by an unauthenticated caller at all (2.4) and processes at most 10 contacts per invocation.
