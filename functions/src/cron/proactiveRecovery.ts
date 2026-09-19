import * as admin from "firebase-admin";
import { sendWhatsAppMessage } from "../engine/metaSender";
import { trackTenantUsage } from "../metrics/usageTracker";

/**
 * Scheduled job to proactively re-engage leads whose conversations went quiet,
 * strictly executed within Meta's free 24-hour customer care window.
 */
export async function executeProactiveRecovery(db: admin.firestore.Firestore): Promise<{ recoveredCount: number }> {
  const now = Date.now();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
  const twentyTwoHoursAgo = new Date(now - 22 * 60 * 60 * 1000);

  let recoveredCount = 0;

  // Query tenants
  const tenantsSnapshot = await db.collection("tenants").where("status", "==", "active").get();

  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;
    const tenantData = tenantDoc.data();
    const phoneNumberId = tenantData.phoneNumberId;

    if (!phoneNumberId) continue;

    // Find stalled contacts assigned to AI
    const stalledContacts = await db
      .collection("tenants")
      .doc(tenantId)
      .collection("contacts")
      .where("assignedAgent", "==", "ai")
      .where("lastActiveAt", "<=", twoHoursAgo)
      .where("lastActiveAt", ">=", twentyTwoHoursAgo)
      .limit(10)
      .get();

    for (const contactDoc of stalledContacts.docs) {
      const contact = contactDoc.data();
      // Check if already re-engaged in this turn
      if (contact.reengagedAt) continue;

      const contactName = contact.name || "tudo bem?";
      const reengagementText = `Oi ${contactName}! Notei que nossa conversa deu uma pausinha. Ficou alguma dúvida sobre o que conversamos ou gostaria que eu te enviasse mais detalhes para te ajudar a decidir?`;

      try {
        const lastActiveMs = contact.lastActiveAt ? contact.lastActiveAt.toMillis() : Date.now();
        const sendResult = await sendWhatsAppMessage({
          phoneNumberId,
          to: contact.phoneNumber || contact.id,
          text: reengagementText,
          lastContactMessageTimestamp: lastActiveMs,
        });

        // Record message in thread
        const msgRef = db
          .collection("tenants")
          .doc(tenantId)
          .collection("conversations")
          .doc(contact.id)
          .collection("messages")
          .doc();

        await msgRef.set({
          id: msgRef.id,
          conversationId: contact.id,
          sender: "bot",
          text: reengagementText,
          metaMessageId: sendResult.messageId,
          status: "sent",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          isProactiveRecovery: true,
        });

        // Update contact
        await contactDoc.ref.update({
          reengagedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Track usage (within free 24h window!)
        await trackTenantUsage(
          {
            tenantId,
            category: sendResult.category,
            promptTokens: 0,
            candidateTokens: 0,
          },
          db
        );

        recoveredCount++;
      } catch (err) {
        // Continue to next without breaking loop
      }
    }
  }

  return { recoveredCount };
}
