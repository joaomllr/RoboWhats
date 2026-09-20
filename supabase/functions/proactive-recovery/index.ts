import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { sendWhatsAppMessage } from "../_shared/metaSender.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://nsotmdvalhcqrigepkcu.supabase.co";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req: Request) => {
  // Esta função dispara mensagens reais de WhatsApp para contatos reais e
  // estava deployada com verify_jwt: false — qualquer pessoa na internet que
  // descobrisse a URL podia chamá-la repetidamente, sem nenhuma autenticação,
  // gastando cota de Meta/Gemini e reengajando leads reais fora do controle do
  // negócio. Só quem sabe o segredo (o próprio agendador/cron) pode disparar.
  const expectedSecret = Deno.env.get("PROACTIVE_RECOVERY_SECRET");
  if (!expectedSecret) {
    console.error("PROACTIVE_RECOVERY_SECRET is not configured.");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const providedSecret = req.headers.get("x-recovery-secret");
  if (providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

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
    let failed = 0;

    for (const contact of stalledContacts || []) {
      // Cada contato é isolado no próprio try/catch: uma falha de envio (Meta
      // fora do ar, número inválido, etc.) não pode mais abortar o lote
      // inteiro e deixar os demais contatos sem a tentativa de recuperação.
      try {
        // Só reengaja se a ÚLTIMA mensagem da conversa for nossa (outbound) e
        // ainda não tiver sido a própria recuperação — ou seja, o cliente
        // nunca respondeu desde o último contato. Sem essa checagem, o job
        // reenviaria o mesmo nudge a cada execução, indefinidamente, para
        // qualquer contato parado — risco real de spam e de violação das
        // políticas de qualidade de mensageria da Meta.
        const { data: lastMessage } = await supabase
          .from("conversations")
          .select("direction")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMessage?.direction !== "inbound") {
          continue;
        }

        const { data: phoneRecord } = await supabase
          .from("phone_number_index")
          .select("phone_number_id")
          .eq("tenant_id", contact.tenant_id)
          .maybeSingle();

        if (!phoneRecord?.phone_number_id) continue;

        const nameGreeting = contact.name ? `Oi ${contact.name}` : "Olá";
        const recoveryText = `${nameGreeting}! Notei que nossa conversa deu uma pausinha. Ficou alguma dúvida sobre nossos planos ou gostaria que eu te passasse mais detalhes?`;

        await sendWhatsAppMessage({
          phoneNumberId: phoneRecord.phone_number_id,
          to: contact.wa_phone,
          text: recoveryText,
          lastContactTimestampMs: new Date(contact.updated_at).getTime(),
        });

        await supabase.from("conversations").insert({
          tenant_id: contact.tenant_id,
          contact_id: contact.id,
          direction: "outbound",
          message_body: recoveryText,
          message_type: "text",
        });

        await supabase
          .from("contacts")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", contact.id);

        recovered++;
      } catch (contactErr) {
        failed++;
        console.error(`Recovery failed for contact ${contact.id}:`, contactErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, recoveredCount: recovered, failedCount: failed }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
