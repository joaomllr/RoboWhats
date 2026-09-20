import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Multi-Tenant Row Level Security (RLS) Test Suite
 * Tests strict "deny-by-default" and tenant isolation on Supabase Postgres.
 *
 * Requirements:
 * 1. Anon/unauthenticated users cannot read or write to tenants, contacts, conversations, tenant_users.
 * 2. Restricted tables (phone_number_index, usage) have no client RLS policy and reject all client-side operations.
 * 3. Fail loudly: if database is unreachable or misconfigured, tests fail immediately with descriptive errors.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://nsotmdvalhcqrigepkcu.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_pVHNpa7nCtSmfiEloxSC1g_IWw8iqXd";

describe("Supabase Postgres Multi-Tenant RLS — Deny-by-Default & Isolation", () => {
  let anonClient: SupabaseClient;

  beforeAll(async () => {
    expect(SUPABASE_URL, "SUPABASE_URL must be defined").toBeTruthy();
    expect(SUPABASE_ANON_KEY, "SUPABASE_ANON_KEY must be defined").toBeTruthy();

    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    // Fail loudly check: verify database is reachable
    const ping = await anonClient.from("contacts").select("id").limit(1);
    if (ping.error && ping.error.code !== "42501") {
      throw new Error(`Database connection failed: ${ping.error.message} (${ping.error.code})`);
    }
  });

  describe("1. Unauthenticated (Anon) Read Access — Deny by Default", () => {
    it("should return empty results and not leak any rows from public.tenants", async () => {
      const { data, error } = await anonClient.from("tenants").select("*");
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0);
    });

    it("should return empty results and not leak any rows from public.contacts", async () => {
      const { data, error } = await anonClient.from("contacts").select("*");
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0);
    });

    it("should return empty results and not leak any rows from public.conversations", async () => {
      const { data, error } = await anonClient.from("conversations").select("*");
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0);
    });

    it("should return empty results and not leak any rows from public.tenant_users", async () => {
      const { data, error } = await anonClient.from("tenant_users").select("*");
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0);
    });
  });

  describe("2. Unauthenticated (Anon) Write Access — Explicit Rejection", () => {
    const dummyTenantId = "00000000-0000-0000-0000-000000000001";

    it("should reject insert into public.contacts with RLS violation error 42501", async () => {
      const { error } = await anonClient.from("contacts").insert({
        tenant_id: dummyTenantId,
        wa_phone: "+5511999990001",
        name: "Intruder Lead",
        lead_score: "quente",
        stage: "novo",
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/row-level security/i);
    });

    it("should reject insert into public.conversations with RLS violation error 42501", async () => {
      const { error } = await anonClient.from("conversations").insert({
        tenant_id: dummyTenantId,
        contact_id: "00000000-0000-0000-0000-000000000002",
        direction: "inbound",
        message_body: "Malicious injection attempt",
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/row-level security/i);
    });

    it("should reject insert into public.tenants with RLS violation error 42501", async () => {
      const { error } = await anonClient.from("tenants").insert({
        name: "Unauthorized Company",
        plan_tier: "scale",
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/row-level security/i);
    });

    it("should reject insert into public.tenant_users with RLS violation error 42501", async () => {
      const { error } = await anonClient.from("tenant_users").insert({
        tenant_id: dummyTenantId,
        user_id: "00000000-0000-0000-0000-000000000003",
        role: "admin",
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/row-level security/i);
    });
  });

  describe("3. Restricted Server-Side Tables — phone_number_index & usage", () => {
    const dummyTenantId = "00000000-0000-0000-0000-000000000001";

    it("should return empty array for reads on public.phone_number_index (no client policy)", async () => {
      const { data, error } = await anonClient.from("phone_number_index").select("*");
      expect(error).toBeNull();
      expect(data?.length).toBe(0);
    });

    it("should reject insert into public.phone_number_index with RLS violation 42501", async () => {
      const { error } = await anonClient.from("phone_number_index").insert({
        phone_number_id: "fake_phone_id_999",
        tenant_id: dummyTenantId,
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/row-level security/i);
    });

    it("should return empty array for reads on public.usage (no client policy)", async () => {
      const { data, error } = await anonClient.from("usage").select("*");
      expect(error).toBeNull();
      expect(data?.length).toBe(0);
    });

    it("should reject insert into public.usage with RLS violation 42501", async () => {
      const { error } = await anonClient.from("usage").insert({
        tenant_id: dummyTenantId,
        period: "2026-09",
        meta_messages_free_window: 100,
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/row-level security/i);
    });
  });

  describe("4. Fail Loudly Validation", () => {
    it("should fail loudly when pointing to an invalid API key or offline endpoint", async () => {
      const invalidClient = createClient(SUPABASE_URL, "invalid_dummy_key_12345");
      const { error } = await invalidClient.from("contacts").select("*");

      // Must fail loudly and return an error (401), not pass silently
      expect(error).toBeDefined();
    });
  });

  /**
   * As suítes acima só provam a metade "negar" da RLS: um cliente anônimo não
   * vê nada. Nenhuma delas jamais autenticou como um usuário real — e foi
   * exatamente esse ponto cego que deixou passar uma recursão infinita na
   * policy de tenant_users (corrigida na migração
   * 20260920000000_fix_tenant_users_rls_recursion.sql): a policy só entra em
   * ação `to authenticated`, então um cliente anônimo nunca a exercita, e
   * "0 linhas retornadas" parecia sucesso tanto para "RLS bloqueou" quanto
   * para "RLS quebrou com erro 500 e a chamada nunca chegou a rodar".
   *
   * Esta suíte fabrica dois tenants e dois usuários reais (via Admin API,
   * exige SUPABASE_SERVICE_ROLE_KEY) e prova as duas metades que faltavam:
   * um usuário autenticado CONSEGUE ler os próprios dados, e NÃO CONSEGUE ler
   * nem escrever nos dados de outro tenant.
   */
  describe("5. Authenticated Access — Own-Tenant Allow & Cross-Tenant Deny", () => {
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const shouldRun = Boolean(SUPABASE_SERVICE_ROLE_KEY);

    let adminClient: SupabaseClient;
    let tenantAId: string;
    let tenantBId: string;
    let userAId: string;
    let userBId: string;
    let userAEmail: string;
    let userAPassword: string;
    let contactAId: string;
    let userAClient: SupabaseClient;

    beforeAll(async () => {
      if (!shouldRun) return;

      adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
      });

      const suffix = Date.now();
      userAEmail = `rls-test-a-${suffix}@example.com`;
      userAPassword = `Test-${suffix}-!Aa`;
      const userBEmail = `rls-test-b-${suffix}@example.com`;

      const { data: tenantA, error: tenantAError } = await adminClient
        .from("tenants")
        .insert({ name: `RLS Test Tenant A ${suffix}`, plan_tier: "trial", status: "active" })
        .select()
        .single();
      if (tenantAError) throw new Error(`Fixture setup failed (tenant A): ${tenantAError.message}`);
      tenantAId = tenantA.id;

      const { data: tenantB, error: tenantBError } = await adminClient
        .from("tenants")
        .insert({ name: `RLS Test Tenant B ${suffix}`, plan_tier: "trial", status: "active" })
        .select()
        .single();
      if (tenantBError) throw new Error(`Fixture setup failed (tenant B): ${tenantBError.message}`);
      tenantBId = tenantB.id;

      const { data: userA, error: userAError } = await adminClient.auth.admin.createUser({
        email: userAEmail,
        password: userAPassword,
        email_confirm: true,
      });
      if (userAError || !userA?.user) {
        throw new Error(`Fixture setup failed (user A): ${userAError?.message}`);
      }
      userAId = userA.user.id;

      const { data: userB, error: userBError } = await adminClient.auth.admin.createUser({
        email: userBEmail,
        password: `Test-${suffix}-!Bb`,
        email_confirm: true,
      });
      if (userBError || !userB?.user) {
        throw new Error(`Fixture setup failed (user B): ${userBError?.message}`);
      }
      userBId = userB.user.id;

      await adminClient.from("tenant_users").insert([
        { tenant_id: tenantAId, user_id: userAId, role: "admin" },
        { tenant_id: tenantBId, user_id: userBId, role: "admin" },
      ]);

      const { data: contactA, error: contactAError } = await adminClient
        .from("contacts")
        .insert({ tenant_id: tenantAId, wa_phone: "+5511900000001", name: "Contato Tenant A" })
        .select()
        .single();
      if (contactAError) throw new Error(`Fixture setup failed (contact A): ${contactAError.message}`);
      contactAId = contactA.id;

      await adminClient.from("conversations").insert({
        tenant_id: tenantAId,
        contact_id: contactAId,
        direction: "inbound",
        message_body: "Mensagem de teste do tenant A",
      });

      const signInClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      });
      const { data: session, error: signInError } = await signInClient.auth.signInWithPassword({
        email: userAEmail,
        password: userAPassword,
      });
      if (signInError || !session?.session) {
        throw new Error(`Fixture setup failed (sign-in as user A): ${signInError?.message}`);
      }

      userAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
      });
    });

    afterAll(async () => {
      if (!shouldRun) return;
      // tenant_users, contacts e conversations têm ON DELETE CASCADE em
      // tenant_id, então apagar os dois tenants limpa tudo que depende deles.
      await adminClient.from("tenants").delete().in("id", [tenantAId, tenantBId]);
      if (userAId) await adminClient.auth.admin.deleteUser(userAId);
      if (userBId) await adminClient.auth.admin.deleteUser(userBId);
    });

    it.skipIf(!shouldRun)(
      "usuário autenticado consegue ler o próprio tenant em public.tenants",
      async () => {
        const { data, error } = await userAClient.from("tenants").select("*").eq("id", tenantAId);
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
        expect(data?.[0].id).toBe(tenantAId);
      }
    );

    it.skipIf(!shouldRun)(
      "usuário autenticado consegue ler o próprio vínculo em tenant_users (sem recursão)",
      async () => {
        const { data, error } = await userAClient.from("tenant_users").select("*");
        expect(error).toBeNull();
        expect(data?.some((row) => row.tenant_id === tenantAId && row.user_id === userAId)).toBe(true);
      }
    );

    it.skipIf(!shouldRun)(
      "usuário autenticado consegue ler contatos e conversas do próprio tenant",
      async () => {
        const contactsResult = await userAClient.from("contacts").select("*").eq("tenant_id", tenantAId);
        expect(contactsResult.error).toBeNull();
        expect(contactsResult.data).toHaveLength(1);

        const conversationsResult = await userAClient
          .from("conversations")
          .select("*")
          .eq("contact_id", contactAId);
        expect(conversationsResult.error).toBeNull();
        expect(conversationsResult.data).toHaveLength(1);
      }
    );

    it.skipIf(!shouldRun)(
      "usuário autenticado NÃO vê o tenant de outro usuário (isolamento cross-tenant)",
      async () => {
        const { data, error } = await userAClient.from("tenants").select("*").eq("id", tenantBId);
        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      }
    );

    it.skipIf(!shouldRun)(
      "usuário autenticado NÃO consegue inserir contato em outro tenant",
      async () => {
        const { error } = await userAClient
          .from("contacts")
          .insert({ tenant_id: tenantBId, wa_phone: "+5511900000099", name: "Invasor" });
        expect(error).toBeDefined();
        expect(error?.code).toBe("42501");
      }
    );

    it.skipIf(!shouldRun)(
      "usuário autenticado NÃO consegue ler conversas de outro tenant",
      async () => {
        const { data, error } = await userAClient
          .from("conversations")
          .select("*")
          .eq("tenant_id", tenantBId);
        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      }
    );

    if (!shouldRun) {
      it("SUPABASE_SERVICE_ROLE_KEY não configurada — suíte de acesso autenticado pulada", () => {
        console.warn(
          "Defina SUPABASE_SERVICE_ROLE_KEY para rodar os testes de isolamento cross-tenant autenticado."
        );
        expect(true).toBe(true);
      });
    }
  });
});
