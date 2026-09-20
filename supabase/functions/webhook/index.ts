import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { validateMetaSignature } from "../_shared/signature.ts";
import { AgnosticStateMachineEngine } from "../_shared/stateMachine.ts";
import { runGeminiAgent } from "../_shared/geminiAgent.ts";
import { sendWhatsAppMessage } from "../_shared/metaSender.ts";
import { MetaWebhookPayload } from "../_shared/types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://nsotmdvalhcqrigepkcu.supabase.co";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Initialize privileged admin client for webhook event processing
const supabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Diagnóstico read-only sob demanda (nenhuma escrita, nenhum envio). Confirma
 * diretamente na Graph API se a Meta ainda reconhece este app como inscrito
 * na WABA e qual o status atual do número — sem depender de a Meta chamar
 * este webhook primeiro, que é exatamente o que está em dúvida. Nunca loga
 * nem retorna o access token; wabaId/phoneNumberId são IDs internos da Meta
 * (não PII), já expostos em phone_number_index.
 */
async function runDiagnostics(): Promise<Response> {
  const accessToken = Deno.env.get("META_ACCESS_TOKEN");
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "META_ACCESS_TOKEN não configurado" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: indexRecord, error: indexError } = await supabase
    .from("phone_number_index")
    .select("phone_number_id, waba_id")
    .limit(1)
    .maybeSingle();

  if (indexError || !indexRecord) {
    return new Response(JSON.stringify({ error: "phone_number_index vazio ou inacessível" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { phone_number_id: phoneNumberId, waba_id: wabaId } = indexRecord;
  const graphBase = "https://graph.facebook.com/v26.0";
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  async function probe(url: string) {
    try {
      const res = await fetch(url, { headers: authHeader });
      const bodyText = await res.text();
      return { status: res.status, ok: res.ok, body: bodyText.slice(0, 500) };
    } catch (err) {
      return { status: 0, ok: false, body: err instanceof Error ? err.message : String(err) };
    }
  }

  const [subscribedApps, phoneNumberStatus] = await Promise.all([
    probe(`${graphBase}/${wabaId}/subscribed_apps`),
    probe(
      `${graphBase}/${phoneNumberId}?fields=verified_name,code_verification_status,quality_rating,platform_type,throughput,status`
    ),
  ]);

  return new Response(
    JSON.stringify(
      { checkedAt: new Date().toISOString(), wabaId, phoneNumberId, subscribedApps, phoneNumberStatus },
      null,
      2
    ),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // -------------------------------------------------------------
  // 1. Meta Webhook Verification Handshake (hub.challenge)
  // -------------------------------------------------------------
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expectedToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");

    if (!expectedToken) {
      console.error("META_WEBHOOK_VERIFY_TOKEN is not configured.");
      return new Response("Server misconfigured", { status: 500 });
    }

    // Reaproveita o verify_token como gate (não cria segredo novo): quem não
    // souber o valor recebe a mesma resposta 403 de um handshake normal.
    if (url.searchParams.get("diag") === "status" && token === expectedToken) {
      return await runDiagnostics();
    }

    if (mode === "subscribe" && token === expectedToken) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Verification token mismatch", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // -------------------------------------------------------------
  // 2. Security: HMAC SHA-256 Signature Verification
  // -------------------------------------------------------------
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = Deno.env.get("META_APP_SECRET");
  const rawBodyBytes = new Uint8Array(await req.arrayBuffer());

  if (!appSecret) {
    console.error("META_APP_SECRET is not configured.");
    return new Response("Server misconfigured", { status: 500 });
  }

  const isValidSignature = await validateMetaSignature(rawBodyBytes, signature, appSecret);

  if (!isValidSignature) {
    console.warn("Security Alert: Invalid Meta HMAC signature rejected.");
    return new Response("Forbidden", { status: 403 });
  }

  // Parse JSON
  const bodyText = new TextDecoder().decode(rawBodyBytes);
  const payload: MetaWebhookPayload = JSON.parse(bodyText || "{}");

  try {
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const metadata = change?.metadata;
    const messages = change?.messages;
    const contacts = change?.contacts;

    // A Meta reporta a entrega de cada mensagem enviada (sent / delivered /
    // read / failed) num callback separado, sem o campo "messages". Um envio
    // aceito pela API ainda pode falhar na entrega, e o motivo só aparece aqui.
    // recipient_id (telefone) é mascarado antes de logar — SECURITY.md proíbe
    // PII em texto puro nos logs.
    const statuses = change?.statuses;
    if (statuses?.length) {
      const redacted = statuses.map((s) => ({
        ...s,
        recipient_id: s.recipient_id ? `***${s.recipient_id.slice(-4)}` : s.recipient_id,
      }));
      console.log(`Meta status callback: ${JSON.stringify(redacted)}`);
    }

    if (!metadata?.phone_number_id || !messages || messages.length === 0) {
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    const phoneNumberId = metadata.phone_number_id;
    const incomingMessage = messages[0];
    const senderPhone = incomingMessage.from;
    const messageText = incomingMessage.text?.body || "";
    const senderName = contacts?.[0]?.profile?.name || "Cliente";

    // Para celulares brasileiros a Meta entrega "from" e "wa_id" no formato
    // legado de 12 dígitos (sem o 9º dígito). A allowed list de números de
    // teste guarda o número com o 9, e o match é exato — quem reconcilia as
    // duas formas é brazilianPhoneVariants() dentro de sendWhatsAppMessage.
    const sendToPhone = contacts?.[0]?.wa_id || senderPhone;

    // -------------------------------------------------------------
    // 3. Multi-Tenant Routing via phone_number_index
    // -------------------------------------------------------------
    const { data: indexRecord, error: indexError } = await supabase
      .from("phone_number_index")
      .select("tenant_id")
      .eq("phone_number_id", phoneNumberId)
      .maybeSingle();

    if (indexError || !indexRecord) {
      console.warn(`Unrouted phone_number_id: ${phoneNumberId}`);
      return new Response("PHONE_NOT_CONFIGURED", { status: 200 });
    }

    const tenantId = indexRecord.tenant_id;

    // -------------------------------------------------------------
    // 4. Contact Lookup or Creation
    // -------------------------------------------------------------
    let { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("wa_phone", senderPhone)
      .maybeSingle();

    if (!contact) {
      const { data: newContact, error: createError } = await supabase
        .from("contacts")
        .insert({
          tenant_id: tenantId,
          wa_phone: senderPhone,
          name: senderName,
          lead_score: "frio",
          stage: "novo",
        })
        .select()
        .single();

      if (createError) throw createError;
      contact = newContact;
    }

    // Record incoming message in conversations table
    await supabase.from("conversations").insert({
      tenant_id: tenantId,
      contact_id: contact.id,
      direction: "inbound",
      message_body: messageText,
      message_type: incomingMessage.type || "text",
    });

    // -------------------------------------------------------------
    // 5. Escalation & Business Hours Evaluation
    // -------------------------------------------------------------
    const isEscalation = AgnosticStateMachineEngine.checkHumanEscalation(messageText);

    if (isEscalation) {
      const escalationReply =
        "Perfeito! Já transferi seu atendimento para um de nossos especialistas humanos. Em instantes um consultor falará com você.";

      await sendWhatsAppMessage({
        phoneNumberId,
        to: sendToPhone,
        text: escalationReply,
      });

      await supabase.from("conversations").insert({
        tenant_id: tenantId,
        contact_id: contact.id,
        direction: "outbound",
        message_body: escalationReply,
        message_type: "text",
      });

      await supabase
        .from("contacts")
        .update({ stage: "transbordo_humano", updated_at: new Date().toISOString() })
        .eq("id", contact.id);

      return new Response("ESCALATED", { status: 200 });
    }

    // -------------------------------------------------------------
    // 6. Gemini AI Reasoning & Lead Scoring Turn
    // -------------------------------------------------------------
    const { data: recentMessages } = await supabase
      .from("conversations")
      .select("direction, message_body")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .limit(6);

    const history = (recentMessages || []).reverse();

    const aiTurn = await runGeminiAgent({
      incomingMessage: messageText,
      contactName: contact.name,
      currentStage: contact.stage,
      conversationHistory: history,
    });

    // Determine next stage
    const nextStage = AgnosticStateMachineEngine.evaluateStageTransition(
      contact.stage,
      aiTurn.leadScore,
      false
    );

    // -------------------------------------------------------------
    // 7. Dispatch Outbound Reply via Meta WhatsApp Cloud API
    // -------------------------------------------------------------
    const sendResult = await sendWhatsAppMessage({
      phoneNumberId,
      to: sendToPhone,
      text: aiTurn.replyText,
      lastContactTimestampMs: Date.now(),
    });

    // Save bot reply
    await supabase.from("conversations").insert({
      tenant_id: tenantId,
      contact_id: contact.id,
      direction: "outbound",
      message_body: aiTurn.replyText,
      message_type: "text",
    });

    // Update contact lead score and stage
    await supabase
      .from("contacts")
      .update({
        lead_score: aiTurn.leadScore,
        stage: nextStage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact.id);

    // -------------------------------------------------------------
    // 8. Atomic Usage Metering
    // -------------------------------------------------------------
    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

    const { data: existingUsage } = await supabase
      .from("usage")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("period", currentPeriod)
      .maybeSingle();

    const totalTokens = aiTurn.tokenUsage.promptTokens + aiTurn.tokenUsage.candidateTokens;

    if (existingUsage) {
      await supabase
        .from("usage")
        .update({
          meta_messages_free_window:
            existingUsage.meta_messages_free_window + (sendResult.category === "free_window" ? 1 : 0),
          meta_messages_paid:
            existingUsage.meta_messages_paid + (sendResult.category === "template_paid" ? 1 : 0),
          gemini_tokens_used: existingUsage.gemini_tokens_used + totalTokens,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUsage.id);
    } else {
      await supabase.from("usage").insert({
        tenant_id: tenantId,
        period: currentPeriod,
        meta_messages_free_window: sendResult.category === "free_window" ? 1 : 0,
        meta_messages_paid: sendResult.category === "template_paid" ? 1 : 0,
        gemini_tokens_used: totalTokens,
      });
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response("ERROR_HANDLED", { status: 200 });
  }
});
