import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://nsotmdvalhcqrigepkcu.supabase.co";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_pVHNpa7nCtSmfiEloxSC1g_IWw8iqXd";

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // A função roda com service_role (precisa criar tenant + rotear número), mas
  // quem ela vincula como admin do tenant novo tem que ser o próprio chamador —
  // nunca um userId arbitrário enviado no corpo. Antes disso não havia nenhuma
  // verificação: qualquer requisição podia linkar qualquer userId como admin de
  // um tenant novo, sem provar ser dono daquela conta.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();

  if (callerError || !callerData?.user) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authenticatedUserId = callerData.user.id;

  try {
    const { companyName, phoneNumberId, wabaId, planTier = "starter" } = await req.json();

    if (!companyName || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: "companyName and phoneNumberId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Create Tenant Record
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: companyName,
        plan_tier: planTier,
        status: "active",
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // 2. Link the authenticated caller as admin
    const { error: linkError } = await supabase.from("tenant_users").insert({
      tenant_id: tenant.id,
      user_id: authenticatedUserId,
      role: "admin",
    });
    if (linkError) console.warn("Failed to link tenant_user:", linkError);

    // 3. Register Phone Number in routing index
    const { error: phoneError } = await supabase.from("phone_number_index").insert({
      phone_number_id: phoneNumberId,
      tenant_id: tenant.id,
      waba_id: wabaId || null,
    });

    if (phoneError) throw phoneError;

    return new Response(
      JSON.stringify({
        success: true,
        tenantId: tenant.id,
        message: "Tenant successfully created and routed.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
