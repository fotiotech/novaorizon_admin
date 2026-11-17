"use server";

import { requireAdmin, requireUser } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";

// ------------------ Authentication Helper ------------------
async function getAuthenticatedUser() {
  const user = await requireUser();
  return user.id;
}

// ------------------ Validation Schemas (Zod) ------------------
// Card entry is disabled until a tokenizing/hosted form is integrated.
const paymentMethodSchema = z.discriminatedUnion("methodType", [
  z.object({
    methodType: z.literal("MobileMoney"),
    details: z.object({
      phoneNumber: z.string().min(9).max(13),
      provider: z.enum(["MTN", "Orange", "Camtel"]),
      reference: z.string().optional(),
    }),
  }),
  z.object({
    methodType: z.literal("PayPal"),
    details: z.object({
      email: z.string().email(),
    }),
  }),
]);

// ------------------ CREATE Payment Method ------------------
export async function createPaymentMethod(
  data: z.infer<typeof paymentMethodSchema>,
) {
  await requireAdmin();
  await getAuthenticatedUser();

  if (
    data &&
    typeof data === "object" &&
    (data as { methodType?: string }).methodType === "CreditCard"
  ) {
    throw new Error(
      "Card payments are not enabled yet. Please use Mobile Money or PayPal.",
    );
  }

  const validated = paymentMethodSchema.parse(data);

  // The backend validates again and stores the method for the session user.
  const paymentMethod = await apiData<any>("/payment-methods", {
    method: "POST",
    body: validated,
  });

  revalidatePath("/profile/payment-methods");
  return { success: true, paymentMethod };
}

// ------------------ GET Payment Methods ------------------
export async function getUserPaymentMethods() {
  await requireAdmin();
  await getAuthenticatedUser();

  const methods = await apiData<any[]>("/payment-methods");

  // Return plain objects; the profile page expects fields like last4, cardType, expiryMonth, expiryYear
  return JSON.parse(JSON.stringify(methods ?? []));
}

// ------------------ DELETE Payment Method ------------------
export async function deletePaymentMethod(paymentMethodId: string) {
  await requireAdmin();
  await getAuthenticatedUser();

  try {
    await apiFetch(`/payment-methods/${encodeURIComponent(paymentMethodId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Error("Payment method not found or unauthorized");
    }
    throw error;
  }

  revalidatePath("/profile/payment-methods");
  return { success: true, message: "Deleted" };
}

// ------------------ UPDATE Credit Card ------------------
export async function updateCreditCard(
  paymentMethodId: string,
  updates: {
    expiryDate?: string;
    cardholderName?: string;
    billingAddressId?: string;
  },
) {
  await requireAdmin();
  await getAuthenticatedUser();

  let updated: any;
  try {
    updated = await apiData<any>(
      `/payment-methods/${encodeURIComponent(paymentMethodId)}/card`,
      { method: "PATCH", body: updates },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400) throw new Error("Invalid billing address");
      if (error.status === 404) {
        throw new Error("Credit card not found or unauthorized");
      }
    }
    throw error;
  }

  revalidatePath("/profile/payment-methods");
  return { success: true, paymentMethod: updated };
}
