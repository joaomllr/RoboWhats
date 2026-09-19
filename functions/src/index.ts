import { onRequest, HttpsError } from "firebase-functions/v2/https";
import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { validateMetaSignature } from "./webhook/signature";
import { resolveTenantByPhoneNumberId } from "./engine/tenantResolver";
import { AgnosticStateMachineEngine } from "./engine/stateMachine";
import { runGeminiAgentTurn } from "./engine/geminiAgent";
import { sendWhatsAppMessage } from "./engine/metaSender";
import { trackTenantUsage } from "./metrics/usageTracker";
import { handleTenantOnboarding, OnboardTenantRequest } from "./onboarding/onboardTenant";
import { executeProactiveRecovery } from "./cron/proactiveRecovery";
import { BotConfig, ContactRecord, FunnelStage, MetaWebhookPayload } from "./types";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 1. WhatsApp Cloud API Webhook (2nd Gen HTTP Function)
 * Enforces HMAC SHA-256 validation, resolves multi-tenant routing,
 * executes the hybrid state engine + Gemini AI, and tracks usage.
 */
export const whatsappWebhook = onRequest(
  {
    secrets: ["META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN", "META_ACCESS_TOKEN", "GEMINI_API_KEY"],
    cors: false, // Strict: Meta webhooks are direct server-to-server calls
    timeoutSeconds: 60,
    maxInstances: 50,
  },
  async (req, res) => {
    // -----------------------------------------------------------------
    // A. Meta Webhook Verification (GET Challenge Handshake)
    // -----------------------------------------------------------------
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

      if (!expectedToken) {
        console.error(
          "META_WEBHOOK_VERIFY_TOKEN secret is not configured. Refusing verification handshake."
        );
        res.status(500).send("Server misconfigured");
        return;
      }

      if (mode === "subscribe" && token === expectedToken) {
        res.status(200).send(challenge);
        return;
      }
      res.status(403).send("Verification token mismatch");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // -----------------------------------------------------------------
    // B. Security: HMAC SHA-256 Signature Verification
    // -----------------------------------------------------------------
    const signature = (req.headers["x-hub-signature-256"] || "") as string;
    const appSecret = process.env.META_APP_SECRET;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!appSecret) {
      console.error("META_APP_SECRET secret is not configured. Refusing to process webhook.");
      res.status(500).send("Server misconfigured");
      return;
    }

    const isSignatureValid = validateMetaSignature(rawBody, signature, appSecret);

    if (!isSignatureValid) {
      // Reject suspicious or forged payloads immediately without leaking details.
      // This check is UNCONDITIONAL in production code — there is no environment
      // variable that can bypass it. Tests exercise validateMetaSignature()
      // directly (see tests/signature.test.ts) rather than disabling this gate.
      console.warn("Security alert: Invalid webhook HMAC SHA-256 signature.");
      res.status(403).send("Forbidden");
      return;
    }

    // Respond 200 to Meta immediately to acknowledge receipt within 3s
    const payload = req.body as MetaWebhookPayload;

    try {
      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const metadata = change?.metadata;
      const messages = change?.messages;
      const contactsMeta = change?.contacts;

      if (!metadata?.phone_number_id || !messages || messages.length === 0) {
        res.status(200).send("EVENT_RECEIVED");
        return;
      }

      const phoneNumberId = metadata.phone_number_id;
      const incomingMessage = messages[0];
      const senderPhone = incomingMessage.from; // E.164 without leading plus
      const messageText = incomingMessage.text?.body || "";
      const senderName = contactsMeta?.[0]?.profile?.name || "Cliente";

      // -----------------------------------------------------------------
      // C. Multi-Tenant Resolution
      // -----------------------------------------------------------------
      const tenantId = await resolveTenantByPhoneNumberId(phoneNumberId, db);
      if (!tenantId) {
        console.warn(`Unrouted WhatsApp number: ${phoneNumberId}`);
        res.status(200).send("PHONE_NOT_CONFIGURED");
        return;
      }

      // Load tenant configuration
      const configDoc = await db
        .collection("tenants")
        .doc(tenantId)
        .collection("config")
        .doc("main")
        .get();

      const botConfig: BotConfig = configDoc.exists
        ? (configDoc.data() as BotConfig)
        : ({} as BotConfig);

      // Load or create contact record
      const contactRef = db
        .collection("tenants")
        .doc(tenantId)
        .collection("contacts")
        .doc(senderPhone);

      const contactDoc = await contactRef.get();
      let contact: ContactRecord;

      if (contactDoc.exists) {
        contact = contactDoc.data() as ContactRecord;
      } else {
        contact = {
          id: senderPhone,
          name: senderName,
          phoneNumber: senderPhone,
          funnelStage: "new_lead",
          leadScore: "frio",
          scoreReason: "Primeiro contato recebido",
          currentState: botConfig.stateMachine?.initialState || "welcome",
          assignedAgent: "ai",
          tags: ["novo-contato"],
          extractedData: {},
          lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await contactRef.set(contact);
      }

      // Record incoming customer message
      const messagesCol = db
        .collection("tenants")
        .doc(tenantId)
        .collection("conversations")
        .doc(senderPhone)
        .collection("messages");

      await messagesCol.add({
        id: incomingMessage.id,
        conversationId: senderPhone,
        sender: "contact",
        text: messageText,
        metaMessageId: incomingMessage.id,
        status: "delivered",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // If contact is assigned to human agent, don't generate automated AI reply
      if (contact.assignedAgent === "human") {
        await contactRef.update({
          lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).send("HANDLED_BY_HUMAN");
        return;
      }

      // -----------------------------------------------------------------
      // D. Business Hours Check
      // -----------------------------------------------------------------
      if (!AgnosticStateMachineEngine.isWithinBusinessHours(botConfig)) {
        const outMessage =
          botConfig.businessHours?.outsideHoursMessage ||
          "Nosso horário comercial encerrou no momento. Responderemos amanhã!";

        await sendWhatsAppMessage({
          phoneNumberId,
          to: senderPhone,
          text: outMessage,
        });

        await messagesCol.add({
          conversationId: senderPhone,
          sender: "bot",
          text: outMessage,
          status: "sent",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).send("OUTSIDE_HOURS");
        return;
      }

      // -----------------------------------------------------------------
      // E. Escalation Check
      // -----------------------------------------------------------------
      if (AgnosticStateMachineEngine.checkHumanEscalation(messageText, botConfig)) {
        const escMessage =
          botConfig.escalation?.escalationMessage ||
          "Entendido! Estou transferindo seu contato para nossa equipe humana agora mesmo.";

        await sendWhatsAppMessage({
          phoneNumberId,
          to: senderPhone,
          text: escMessage,
        });

        await messagesCol.add({
          conversationId: senderPhone,
          sender: "bot",
          text: escMessage,
          status: "sent",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        await contactRef.update({
          assignedAgent: "human",
          currentState: "human_escalated",
          lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).send("ESCALATED_TO_HUMAN");
        return;
      }

      // -----------------------------------------------------------------
      // F. Hybrid Engine: Gemini Reasoning + Agnostic State Machine
      // -----------------------------------------------------------------
      // Fetch recent history
      const recentMessagesSnapshot = await messagesCol.orderBy("timestamp", "desc").limit(6).get();
      const history = recentMessagesSnapshot.docs
        .map((d) => d.data())
        .reverse()
        .map((m) => ({
          sender: m.sender as string,
          text: m.text as string,
        }));

      // Call Gemini
      const aiResult = await runGeminiAgentTurn({
        incomingMessage: messageText,
        contact,
        config: botConfig,
        conversationHistory: history,
      });

      // Evaluate state transition
      const stateDecision = AgnosticStateMachineEngine.evaluateTransition({
        incomingText: messageText,
        contact,
        config: botConfig,
        proposedNextState: aiResult.nextState,
      });

      // Update Funnel Stage according to Lead Score
      let updatedFunnelStage: FunnelStage = contact.funnelStage;
      if (aiResult.leadScore === "quente") {
        updatedFunnelStage = "hot_lead";
      } else if (contact.funnelStage === "new_lead" && aiResult.leadScore === "morno") {
        updatedFunnelStage = "new_lead";
      }

      // Send reply back to customer via Meta Cloud API
      const sendResult = await sendWhatsAppMessage({
        phoneNumberId,
        to: senderPhone,
        text: aiResult.replyText,
        lastContactMessageTimestamp: Date.now(),
      });

      // Save bot reply
      await messagesCol.add({
        conversationId: senderPhone,
        sender: "bot",
        text: aiResult.replyText,
        metaMessageId: sendResult.messageId,
        status: "sent",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        tokensUsed: {
          prompt: aiResult.tokenUsage.promptTokens,
          candidates: aiResult.tokenUsage.candidateTokens,
        },
      });

      // Update contact metadata
      await contactRef.update({
        currentState: stateDecision.nextState,
        leadScore: aiResult.leadScore,
        scoreReason: aiResult.scoreReason,
        funnelStage: updatedFunnelStage,
        extractedData: {
          ...(contact.extractedData || {}),
          ...(aiResult.extractedData || {}),
        },
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // -----------------------------------------------------------------
      // G. Usage Tracking / Metering
      // -----------------------------------------------------------------
      await trackTenantUsage(
        {
          tenantId,
          category: sendResult.category,
          promptTokens: aiResult.tokenUsage.promptTokens,
          candidateTokens: aiResult.tokenUsage.candidateTokens,
        },
        db
      );

      res.status(200).send("SUCCESS");
    } catch (err) {
      console.error("Webhook processing failure:", err);
      res.status(200).send("ERROR_HANDLED");
    }
  }
);

/**
 * 2. Tenant Onboarding (2nd Gen Callable Function)
 * Verifies email/auth, mints tenantId custom claim, seeds config & phone index.
 */
export const onboardTenant = onCall(
  {
    enforceAppCheck: false, // Set to true when App Check site key is deployed in production
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated to onboard a tenant.");
    }

    const data = request.data as OnboardTenantRequest;
    return handleTenantOnboarding(request.auth.uid, data, db);
  }
);

/**
 * 3. Proactive Recovery Job (2nd Gen Cloud Scheduler)
 * Runs hourly to re-engage inactive leads within the free 24-hour window.
 */
export const proactiveRecoveryCron = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/Sao_Paulo",
  },
  async () => {
    const result = await executeProactiveRecovery(db);
    console.log(`Proactive recovery executed. Recovered leads: ${result.recoveredCount}`);
  }
);

/**
 * 4. Assign Agent (2nd Gen Callable Function)
 * Toggles contact between "ai" and "human" agent from the Unified Inbox.
 */
export const assignAgent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { tenantId, contactId, agent } = request.data as {
    tenantId: string;
    contactId: string;
    agent: "ai" | "human";
  };

  if (!tenantId || !contactId || !agent) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  // Verify caller belongs to the tenant
  if (request.auth.token.tenantId !== tenantId) {
    throw new HttpsError("permission-denied", "Access to tenant forbidden.");
  }

  await db
    .collection("tenants")
    .doc(tenantId)
    .collection("contacts")
    .doc(contactId)
    .update({
      assignedAgent: agent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return { success: true, contactId, agent };
});
