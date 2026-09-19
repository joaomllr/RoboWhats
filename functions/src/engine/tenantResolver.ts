import * as admin from "firebase-admin";

/**
 * Resolves a Meta Phone Number ID to its corresponding SaaS tenantId.
 * Queries the protected internal collection `phoneNumberIndex/{phoneNumberId}`.
 */
export async function resolveTenantByPhoneNumberId(
  phoneNumberId: string,
  db: admin.firestore.Firestore
): Promise<string | null> {
  if (!phoneNumberId) {
    return null;
  }

  const indexDoc = await db.collection("phoneNumberIndex").doc(phoneNumberId).get();
  if (!indexDoc.exists) {
    return null;
  }

  const data = indexDoc.data();
  return (data?.tenantId as string) || null;
}

/**
 * Registers or updates a phone number index mapping to a tenant.
 */
export async function registerPhoneNumberMapping(
  phoneNumberId: string,
  tenantId: string,
  db: admin.firestore.Firestore
): Promise<void> {
  await db.collection("phoneNumberIndex").doc(phoneNumberId).set(
    {
      tenantId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
