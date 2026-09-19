import * as admin from "firebase-admin";

export interface RecordUsageInput {
  tenantId: string;
  category: "free_window" | "template_utility" | "template_marketing";
  promptTokens: number;
  candidateTokens: number;
}

/**
 * Atomically updates the monthly usage document for a tenant.
 * Uses Firestore FieldValue.increment() for race-condition-free metering.
 */
export async function trackTenantUsage(
  input: RecordUsageInput,
  db: admin.firestore.Firestore
): Promise<void> {
  const { tenantId, category, promptTokens, candidateTokens } = input;
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const usageRef = db
    .collection("tenants")
    .doc(tenantId)
    .collection("usage")
    .doc(yearMonth);

  // Approximate Gemini Flash cost estimate: $0.10 / 1M prompt tokens, $0.40 / 1M candidate tokens
  const estimatedCostUsd =
    (promptTokens / 1_000_000) * 0.1 + (candidateTokens / 1_000_000) * 0.4;

  const updatePayload: Record<string, unknown> = {
    period: yearMonth,
    "geminiTokens.promptTokens": admin.firestore.FieldValue.increment(promptTokens),
    "geminiTokens.candidateTokens": admin.firestore.FieldValue.increment(candidateTokens),
    "geminiTokens.totalCostEstimatedUsd": admin.firestore.FieldValue.increment(estimatedCostUsd),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (category === "free_window") {
    updatePayload["metaMessages.freeCustomerCareWindow"] =
      admin.firestore.FieldValue.increment(1);
  } else if (category === "template_marketing") {
    updatePayload["metaMessages.billableTemplateMarketing"] =
      admin.firestore.FieldValue.increment(1);
  } else {
    updatePayload["metaMessages.billableTemplateUtility"] =
      admin.firestore.FieldValue.increment(1);
  }

  await usageRef.set(updatePayload, { merge: true });
}
