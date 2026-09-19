import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { sendWhatsAppMessage } from "../_shared/metaSender.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://nsotmdvalhcqrigepkcu.supabase.co";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (_req: Request) => {
  try {
    const now = Date.now();
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const twentyTwoHoursAgo = new Date(now - 22 * 60 * 60 * 1000).toISOString();

    // Query stalled contacts in qualification
    const { data: stalledContacts, error: queryError } = await supabase
      .from("contacts")
      .select("id, tenant_id, wa_phone, name, updated_at")
      .in("stage", ["novo", "qualificando"])
      .lte("updated_at", twoHoursAgo)
      .gte("updated_at", twentyTwoHoursAgo)
      .limit(10);

    if (queryError) throw queryError;

    let recovered = 0;

    for (const contact of stalledContacts || []) {
      // Find tenant's phone number
      const { data: phoneRecord } = await supabase
        .from("phone_number_index")
        .select("phone_number_id")
        .eq("tenant_id", contact.tenant_id)
        .maybeSingle();

      if (!phoneRecord?.phone_number_id) continue;

      const nameGreeting = contact.name ? `Oi ${contact.name}` : "Olá";
      const recoveryText = `${nameGreeting}! Notei que nossa conversa deu uma pausinha. Ficou alguma dúvida sobre nossos planos ou gostaria que eu te passasse mais detalhes?`;

      const sendResult = await sendWhatsAppMessage({
        phoneNumberId: phoneRecord.phone_number_id,
        to: contact.wa_phone,
        text: recoveryText,
        lastContactTimestampMs: new Date(contact.updated_at).getTime(),
      });

      // Save message in conversations
      await supabase.from("conversations").insert({
        tenant_id: contact.tenant_id,
        contact_id: contact.id,
        direction: "outbound",
        message_body: recoveryText,
        message_type: "text",
      });

      // Update contact timestamp to avoid double reengagement
      await supabase
        .from("contacts")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", contact.id);

      recovered++;
    }

    return new Response(
      JSON.stringify({ success: true, recoveredCount: recovered }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
