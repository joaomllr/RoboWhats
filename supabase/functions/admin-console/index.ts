import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://nsotmdvalhcqrigepkcu.supabase.co";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_pVHNpa7nCtSmfiEloxSC1g_IWw8iqXd";

// service_role: opera cross-tenant de propósito (listar/criar/pausar
// QUALQUER tenant) — é exatamente por isso que a autorização abaixo nunca
// pode ser pulada. RLS não ajudaria aqui mesmo se quiséssemos: um admin da
// Fluxi por definição precisa enxergar dados fora do próprio tenant_users.
const supabase = createClient(supabaseUrl, serviceRoleKey);

const VALID_STATUSES = ["active", "suspended", "cancelled"];

function jsonResponse(body: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

interface BotConfigPayload {
  bot_name?: string;
  tone?: string;
  company_description?: string;
  sales_pitch?: string;
  knowledge_base?: string[];
  business_hours_enabled?: boolean;
  business_hours_start?: string;
  business_hours_end?: string;
  outside_hours_message?: string;
  escalation_keywords?: string[];
  escalation_message?: string;
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405, req);
  }

  // -------------------------------------------------------------
  // Autenticação: o chamador precisa ser um usuário Supabase real
  // (Authorization header), e esse usuário precisa estar em
  // platform_admins. Nunca confiamos em nada do corpo da requisição pra
  // decidir isso — mesmo padrão de onboard-tenant (auth.getUser() com o
  // client autenticado como o próprio chamador), mais a checagem extra de
  // platform_admins que só existe aqui.
  // -------------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401, req);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();

  if (callerError || !callerData?.user) {
    return jsonResponse({ error: "Invalid or expired session" }, 401, req);
  }

  const callerId = callerData.user.id;

  const { data: adminRow } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", callerId)
    .maybeSingle();

  if (!adminRow) {
    console.warn(`admin-console: acesso negado a user_id não-admin (${callerId})`);
    return jsonResponse({ error: "Forbidden" }, 403, req);
  }

  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  const { action, payload = {} } = body;

  try {
    switch (action) {
      case "list_tenants": {
        const { data: tenants, error } = await supabase
          .from("tenants")
          .select("id, name, plan_tier, status, created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        const { data: usageRows } = await supabase
          .from("usage")
          .select("tenant_id, meta_messages_free_window, meta_messages_paid")
          .eq("period", currentPeriod);

        const usageByTenant = new Map(
          (usageRows || []).map((u) => [u.tenant_id, (u.meta_messages_free_window || 0) + (u.meta_messages_paid || 0)])
        );

        return jsonResponse(
          {
            tenants: (tenants || []).map((t) => ({
              ...t,
              messages_this_month: usageByTenant.get(t.id) || 0,
            })),
          },
          200,
          req
        );
      }

      case "get_tenant_detail": {
        const tenantId = payload.tenant_id as string;
        if (!tenantId) return jsonResponse({ error: "tenant_id is required" }, 400, req);

        const [{ data: tenant }, { data: botConfig }, { data: phoneIndex }, { data: statusHistory }] =
          await Promise.all([
            supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle(),
            supabase.from("bot_configs").select("*").eq("tenant_id", tenantId).maybeSingle(),
            supabase.from("phone_number_index").select("*").eq("tenant_id", tenantId).maybeSingle(),
            supabase
              .from("tenant_status_history")
              .select("*")
              .eq("tenant_id", tenantId)
              .order("created_at", { ascending: false }),
          ]);

        if (!tenant) return jsonResponse({ error: "Tenant not found" }, 404, req);

        return jsonResponse(
          { tenant, botConfig, phoneIndex, statusHistory: statusHistory || [] },
          200,
          req
        );
      }

      case "create_tenant": {
        const name = payload.name as string;
        const planTier = (payload.plan_tier as string) || "starter";
        const phoneNumberId = payload.phone_number_id as string | undefined;
        const wabaId = payload.waba_id as string | undefined;
        const botConfig = (payload.bot_config as BotConfigPayload) || {};

        if (!name) return jsonResponse({ error: "name is required" }, 400, req);

        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .insert({ name, plan_tier: planTier, status: "active" })
          .select()
          .single();
        if (tenantError) throw tenantError;

        // Venda assistida pelo admin (ADR-017, item 4): não força cartão nem
        // checkout — o tenant nasce direto 'active'. Sem criação de login do
        // cliente nesta etapa; fica como próximo passo separado.
        if (phoneNumberId) {
          const { error: phoneError } = await supabase
            .from("phone_number_index")
            .insert({ phone_number_id: phoneNumberId, tenant_id: tenant.id, waba_id: wabaId || null });
          if (phoneError) throw phoneError;
        }

        const { error: botConfigError } = await supabase.from("bot_configs").insert({
          tenant_id: tenant.id,
          ...(botConfig.bot_name && { bot_name: botConfig.bot_name }),
          ...(botConfig.tone && { tone: botConfig.tone }),
          ...(botConfig.company_description && { company_description: botConfig.company_description }),
          ...(botConfig.sales_pitch && { sales_pitch: botConfig.sales_pitch }),
          ...(botConfig.knowledge_base && { knowledge_base: botConfig.knowledge_base }),
          ...(botConfig.business_hours_enabled !== undefined && {
            business_hours_enabled: botConfig.business_hours_enabled,
          }),
          ...(botConfig.business_hours_start && { business_hours_start: botConfig.business_hours_start }),
          ...(botConfig.business_hours_end && { business_hours_end: botConfig.business_hours_end }),
          ...(botConfig.outside_hours_message && { outside_hours_message: botConfig.outside_hours_message }),
          ...(botConfig.escalation_keywords && { escalation_keywords: botConfig.escalation_keywords }),
          ...(botConfig.escalation_message && { escalation_message: botConfig.escalation_message }),
        });
        if (botConfigError) throw botConfigError;

        await supabase.from("tenant_status_history").insert({
          tenant_id: tenant.id,
          old_status: null,
          new_status: "active",
          changed_by: callerId,
          reason: "Cadastro manual pelo admin",
        });

        return jsonResponse({ success: true, tenantId: tenant.id }, 200, req);
      }

      case "update_tenant_status": {
        const tenantId = payload.tenant_id as string;
        const newStatus = payload.new_status as string;
        const reason = (payload.reason as string) || null;

        if (!tenantId || !newStatus) {
          return jsonResponse({ error: "tenant_id and new_status are required" }, 400, req);
        }
        if (!VALID_STATUSES.includes(newStatus)) {
          return jsonResponse({ error: `new_status must be one of: ${VALID_STATUSES.join(", ")}` }, 400, req);
        }

        const { data: current, error: fetchError } = await supabase
          .from("tenants")
          .select("status")
          .eq("id", tenantId)
          .maybeSingle();
        if (fetchError) throw fetchError;
        if (!current) return jsonResponse({ error: "Tenant not found" }, 404, req);

        const { error: updateError } = await supabase
          .from("tenants")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", tenantId);
        if (updateError) throw updateError;

        await supabase.from("tenant_status_history").insert({
          tenant_id: tenantId,
          old_status: current.status,
          new_status: newStatus,
          changed_by: callerId,
          reason,
        });

        return jsonResponse({ success: true }, 200, req);
      }

      case "save_tenant_bot_config": {
        const tenantId = payload.tenant_id as string;
        const botConfig = payload.bot_config as BotConfigPayload;
        if (!tenantId || !botConfig) {
          return jsonResponse({ error: "tenant_id and bot_config are required" }, 400, req);
        }

        const { error } = await supabase
          .from("bot_configs")
          .upsert({ tenant_id: tenantId, ...botConfig }, { onConflict: "tenant_id" });
        if (error) throw error;

        return jsonResponse({ success: true }, 200, req);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400, req);
    }
  } catch (err: any) {
    console.error("admin-console error:", err);
    return jsonResponse({ error: err.message || "Internal Server Error" }, 500, req);
  }
});
