import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://nsotmdvalhcqrigepkcu.supabase.co";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { companyName, phoneNumberId, wabaId, planTier = "starter", userId } = await req.json();

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

    // 2. Link User if provided
    if (userId) {
      const { error: linkError } = await supabase.from("tenant_users").insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: "admin",
      });
      if (linkError) console.warn("Failed to link tenant_user:", linkError);
    }

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
