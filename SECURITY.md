# Security Policy & Architecture (`SECURITY.md`)

## 1. Overview
The **WhatsApp Sales Hub** platform processes third-party personal data, leads, and customer sales conversations at scale. Security is treated as an absolute architectural requirement with zero exceptions. Every layer of the platform is designed under zero-trust, least-privilege, and defense-in-depth principles.

---

## 2. Mandatory Security Rules & Implementations

### 2.1. Secret Management (Zero Plaintext Secrets)
- **Rule**: No secrets, credentials, or private keys are ever stored in source code, committed files, or plaintext `.env` files.
- **Implementation**: 
  - All sensitive tokens (`META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_ACCESS_TOKEN`, `GEMINI_API_KEY`) reside exclusively in **Google Cloud Secret Manager**.
  - In Firebase Functions 2nd Generation, secrets are injected at runtime via the `secrets: [...]` configuration option in function definitions.
  - Development and CI rely exclusively on mocked payloads or ephemeral test keys.
  - Strict `.gitignore` rules prevent accidental commits of `.env` or credential files.

### 2.2. Webhook Signature Verification (HMAC SHA-256)
- **Rule**: Every HTTP request received at the WhatsApp Cloud API webhook endpoint must be verified against the Meta App Secret before parsing or processing.
- **Implementation**:
  - The raw HTTP request body is evaluated against the `X-Hub-Signature-256` header using HMAC SHA-256.
  - If the signature is missing, invalid, or malformed, the request is immediately terminated with HTTP `403 Forbidden`.
  - Suspicious requests are logged with timestamp and event metadata only (no body echo).

### 2.3. Firestore Security Rules: Deny by Default & Tenant Isolation
- **Rule**: The database must reject all operations unless an explicit permission is granted for the authenticated user's tenant.
- **Implementation**:
  - Base rule: `match /{document=**} { allow read, write: if false; }`.
  - Tenant scope: `match /tenants/{tenantId}/{document=**}` allows access if and only if:
    ```cel
    request.auth != null && request.auth.token.tenantId == tenantId
    ```
  - Cross-tenant read/write attempts are impossible at the database engine level.
  - Internal collections such as `phoneNumberIndex` and `usage` counters cannot be modified directly by client SDKs.
  - Automated tests with `@firebase/rules-unit-testing` (`functions/tests/rules.test.ts`) run against a live Firestore Emulator in CI (`firebase emulators:exec --only firestore`, see `.github/workflows/ci.yml`) to verify that cross-tenant access is strictly blocked. These tests fail loudly (rather than skipping silently) if the emulator is unreachable.

### 2.4. Firebase App Check Enforcement — ⚠️ PLANNED, NOT YET ENFORCED
- **Rule**: All custom HTTPS Cloud Functions invoked by the self-service dashboard frontend must require valid Firebase App Check tokens in **Enforcement Mode** (not just monitoring) before onboarding real customer tenants.
- **Current status (as of this writing)**: `enforceAppCheck` is set to `false` on the `onboardTenant` callable function (see `functions/src/index.ts`), and the dashboard frontend does not yet initialize the App Check SDK. This is a known, tracked gap — not an oversight to be assumed fixed.
- **Required before production use with real customers**:
  1. Register a reCAPTCHA Enterprise (or App Check debug/reCAPTCHA v3) provider in the Firebase console for this project.
  2. Initialize App Check in the dashboard frontend (`apps/dashboard/src/lib/firebase.ts`) with `initializeAppCheck()` before any Firestore/Functions call.
  3. Set `enforceAppCheck: true` on every callable Cloud Function (`onboardTenant`, `assignAgent`).
  4. Re-verify with a manual test that an unverified origin is rejected.
  - Note: The Meta WhatsApp webhook is intentionally exempt from App Check — it is verified instead via HMAC SHA-256 signature checking (see 2.2), since Meta's servers cannot carry an App Check token.

### 2.5. Least Privilege IAM
- **Rule**: Cloud Functions must never run under the default project Service Account with Editor/Owner roles.
- **Implementation**:
  - Dedicated service accounts are specified for backend services with granular permissions (e.g. `roles/datastore.user`, `roles/secretmanager.secretAccessor`).

### 2.6. Authentication & Server-Side Custom Claims
- **Rule**: Multi-tenant authorization depends on tamper-proof claims minted on the server.
- **Implementation**:
  - Firebase Authentication requires email verification before granting full operational access.
  - Claims (`tenantId`, `role`) are assigned strictly via trusted Cloud Functions (Admin SDK) during onboarding and cannot be modified by client requests.

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
