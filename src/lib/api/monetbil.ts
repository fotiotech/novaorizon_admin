// lib/api/monetbil.ts
import api from "@/lib/api";
import type { MonetbilPaymentRequest } from "@/constant/types";

/* ------------------------------ types ------------------------------ */

export interface MonetbilLinkResponse {
  paymentUrl?: string;
  [k: string]: any;
}

/* --------------------------- payment link -------------------------- */

/**
 * POST /api/monetbil/link — admin only.
 * Returns the hosted payment URL, or `null` when the link could not be
 * generated (mirrors the old server action).
 */
export async function generatePaymentLink(
  paymentData: MonetbilPaymentRequest,
): Promise<string | null> {
  try {
    const res = await api.post<{ data: MonetbilLinkResponse }>(
      "/monetbil/link",
      paymentData,
    );
    return res.data?.data?.paymentUrl ?? null;
  } catch (error) {
    console.error("Error generating payment link:", error);
    return null;
  }
}

/* ------------------------ payment notification --------------------- */

/**
 * POST /api/monetbil/notify — public webhook endpoint.
 * Applies Monetbil's status to the matching order (status mapping and
 * shipping creation live in the backend controller).
 */
export async function notifyMonetbilPayment(
  payment_ref: string,
  transaction_id: string,
  status: string,
): Promise<void> {
  if (!payment_ref || !transaction_id || !status) return;

  try {
    await api.post("/monetbil/notify", {
      payment_ref,
      transaction_id,
      status,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
  }
}
