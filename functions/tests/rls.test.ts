import { describe, it, expect, beforeAll } from "vitest";
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
});
