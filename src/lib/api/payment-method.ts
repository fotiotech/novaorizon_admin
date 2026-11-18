// lib/api/payment-method.ts
import api from "@/lib/api";

/* ------------------------------ types ------------------------------ */

export type PaymentMethodType = "CreditCard" | "MobileMoney" | "PayPal";

export type MobileMoneyProvider = "MTN" | "Orange" | "Camtel";

export interface MobileMoneyDetails {
  phoneNumber: string;
  provider: MobileMoneyProvider;
  reference?: string;
}

export interface PayPalDetails {
  email: string;
}

/** Payload accepted by POST /api/payment-methods (cards are not enabled yet). */
export type CreatePaymentMethodInput =
  | { methodType: "MobileMoney"; details: MobileMoneyDetails }
  | { methodType: "PayPal"; details: PayPalDetails };

/** Shape of a payment-method row returned by the backend. */
export interface ApiPaymentMethod {
  _id: string;
  userId?: string;
  methodType: PaymentMethodType | string;
  details: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

export interface PaymentMethodMutationResult {
  success: boolean;
  paymentMethod?: ApiPaymentMethod;
  message?: string;
}

/* ----------------------------- helpers ----------------------------- */

function statusOf(err: any): number | undefined {
  return err?.response?.status;
}

function toMessage(err: any): string {
  const payload = err?.response?.data;
  if (payload?.errors && typeof payload.errors === "object") {
    const flat = Object.entries(payload.errors as Record<string, unknown>)
      .flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [],
      )
      .join("; ");
    if (flat) return flat;
  }
  return payload?.message || err?.message || "Request failed";
}

/* ------------------------------- CRUD ------------------------------ */

/**
 * GET /api/payment-methods — scoped to the authenticated user.
 * The backend populates `details.billingAddressId`; consumers rely on fields
 * like `last4`, `expiryMonth`, `expiryYear`, so the plain JSON is returned.
 */
export async function getUserPaymentMethods(): Promise<ApiPaymentMethod[]> {
  const res = await api.get<{ data: ApiPaymentMethod[] }>("/payment-methods");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** POST /api/payment-methods — card entry stays disabled until tokenized. */
export async function createPaymentMethod(
  input: CreatePaymentMethodInput,
): Promise<PaymentMethodMutationResult> {
  if ((input as { methodType?: string })?.methodType === "CreditCard") {
    throw new Error(
      "Card payments are not enabled yet. Please use Mobile Money or PayPal.",
    );
  }

  try {
    const res = await api.post<{ success: boolean; data: ApiPaymentMethod }>(
      "/payment-methods",
      input,
    );
    return { success: true, paymentMethod: res.data.data };
  } catch (err) {
    throw new Error(toMessage(err));
  }
}

/** DELETE /api/payment-methods/:id — scoped to the authenticated user. */
export async function deletePaymentMethod(
  paymentMethodId: string,
): Promise<PaymentMethodMutationResult> {
  try {
    const res = await api.delete<{ success: boolean; message?: string }>(
      `/payment-methods/${encodeURIComponent(paymentMethodId)}`,
    );
    return { success: true, message: res.data?.message };
  } catch (err) {
    if (statusOf(err) === 404) {
      throw new Error("Payment method not found or unauthorized");
    }
    throw new Error(toMessage(err));
  }
}

/** PATCH /api/payment-methods/:id/card — credit-card details only. */
export async function updateCreditCard(
  paymentMethodId: string,
  updates: {
    expiryDate?: string;
    cardholderName?: string;
    billingAddressId?: string;
  },
): Promise<PaymentMethodMutationResult> {
  try {
    const res = await api.patch<{ success: boolean; data: ApiPaymentMethod }>(
      `/payment-methods/${encodeURIComponent(paymentMethodId)}/card`,
      updates,
    );
    return { success: true, paymentMethod: res.data.data };
  } catch (err) {
    if (statusOf(err) === 400) throw new Error("Invalid billing address");
    if (statusOf(err) === 404) {
      throw new Error("Credit card not found or unauthorized");
    }
    throw new Error(toMessage(err));
  }
}
