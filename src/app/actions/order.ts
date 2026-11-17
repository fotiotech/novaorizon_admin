"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";

/**
 * Orders live in the Express backend (`/api/orders`). These actions are thin,
 * authenticated proxies so the existing UI keeps its call signatures.
 */

type OrderPaymentStatus =
  | "pending"
  | "cod_pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "in transit"
  | "completed"
  | "return_requested"
  | "cancelled"
  | "returned";

interface OrderAddressInput {
  street?: string;
  city?: string;
  region?: string;
  address?: string;
  country?: string;
  carrier?: string;
}

interface OrderInput {
  tax?: number;
  shippingCost?: number;
  paymentStatus?: OrderPaymentStatus;
  shippingStatus?: "pending" | "shipped" | "delivered";
  orderStatus?: OrderStatus;
  discount?: number;
  shippingAddress?: OrderAddressInput;
  billingAddress?: OrderAddressInput;
  billingAddressId?: string | null;
  paymentMethodId?: string | null;
  [key: string]: any;
}

export async function findOrders(options?: {
  orderNumber?: string;
  userId?: string | null;
  page?: number;
  limit?: number;
  orderStatus?: string;
  paymentStatus?: string;
  search?: string; // will search in orderNumber, email, firstName, lastName
  dateFrom?: Date;
  dateTo?: Date;
  carrier?: string; // NEW: filter by carrier name
}) {
  await requireAdmin();

  const {
    orderNumber,
    userId,
    page = 1,
    limit = 10,
    orderStatus,
    paymentStatus,
    search,
    dateFrom,
    dateTo,
    carrier, // destructure carrier
  } = options || {};

  try {
    return await apiData<{
      orders: any[];
      total: number;
      totalPages: number;
      currentPage: number;
    }>("/orders", {
      query: {
        orderNumber,
        userId,
        page,
        limit,
        orderStatus,
        paymentStatus,
        search,
        dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
        dateTo: dateTo ? dateTo.toISOString() : undefined,
        carrier,
      },
    });
  } catch (error: any) {
    console.error(`Error fetching orders: ${error.message}`);
    throw error;
  }
}

export async function updateOrderStatus(
  orderNumber: string,
  updates: {
    paymentStatus?: OrderPaymentStatus;
    orderStatus?: OrderStatus;
  },
): Promise<{ success: boolean; order?: any; error?: string }> {
  await requireAdmin();

  if (!orderNumber) {
    return { success: false, error: "Order number is required" };
  }

  if (!updates.paymentStatus && !updates.orderStatus) {
    return { success: false, error: "At least one status must be provided" };
  }

  try {
    // The backend also handles the paid-transition side effects (inventory
    // deduction, invoice creation) and refund transactions.
    const order = await apiData<any>(
      `/orders/${encodeURIComponent(orderNumber)}/status`,
      {
        method: "PATCH",
        body: {
          paymentStatus: updates.paymentStatus,
          orderStatus: updates.orderStatus,
        },
      },
    );

    // Revalidate relevant paths
    revalidatePath("/sales/orders");
    // Optionally revalidate carrier detail pages (if we know the carrier, but it's not in scope)
    // The client will refresh via router.refresh()

    return { success: true, order };
  } catch (error: any) {
    console.error("[updateOrderStatus] Error:", error.message);
    if (error instanceof ApiError && error.status === 404) {
      return {
        success: false,
        error: `Order with number ${orderNumber} not found`,
      };
    }
    return { success: false, error: error.message };
  }
}

export async function completePOSOrder(
  identifier: { userId?: string; sessionId?: string },
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    paymentMethod?: string;
    notes?: string;
    country?: string;
    city?: string;
    region?: string;
    street?: string;
    address?: string;
  },
): Promise<{ success: boolean; order?: any; error?: string }> {
  await requireAdmin();

  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) {
    return { success: false, error: "No active POS session found." };
  }

  try {
    const order = await apiData<any>("/orders/pos", {
      method: "POST",
      body: { identifier, customer },
    });

    revalidatePath("/pos");
    revalidatePath("/sales/orders");
    revalidatePath("/inventory");

    return { success: true, order };
  } catch (error: any) {
    console.error("[completePOSOrder] Error:", error);
    // ValidationError puts the human-readable message in `fieldErrors._form`.
    const formError =
      error instanceof ApiError ? error.fieldErrors?._form?.[0] : undefined;
    return {
      success: false,
      error: formError || error.message || "Unable to complete sale.",
    };
  }
}

export async function requestReturn(
  orderNumber: string,
  reason: string,
): Promise<{ success: boolean; error?: string; order?: any }> {
  await requireAdmin();

  const normalizedReason = (reason || "Customer requested a return").trim();
  if (!orderNumber) {
    return { success: false, error: "Order number is required." };
  }

  try {
    const order = await apiData<any>(
      `/orders/${encodeURIComponent(orderNumber)}/return`,
      { method: "POST", body: { reason: normalizedReason } },
    );

    revalidatePath("/sales/refunds");
    return { success: true, order };
  } catch (error: any) {
    console.error("[requestReturn] Error:", error);
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Order not found." };
    }
    return {
      success: false,
      error: error.message || "Unable to request return.",
    };
  }
}

export async function resolveReturnRequest(
  orderNumber: string,
  action: "approve" | "reject",
  options?: { reason?: string; refundAmount?: number },
): Promise<{ success: boolean; error?: string; order?: any }> {
  await requireAdmin();

  if (!orderNumber) {
    return { success: false, error: "Order number is required." };
  }

  try {
    const order = await apiData<any>(
      `/orders/${encodeURIComponent(orderNumber)}/return/resolve`,
      { method: "POST", body: { action, options } },
    );

    revalidatePath("/sales/refunds");
    if (action === "approve") revalidatePath("/sales/orders");
    return { success: true, order };
  } catch (error: any) {
    console.error("[resolveReturnRequest] Error:", error);
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Order not found." };
    }
    return {
      success: false,
      error: error.message || "Unable to resolve return request.",
    };
  }
}

export async function createOrUpdateOrder(
  payment_ref: string,
  data: Partial<OrderInput>,
): Promise<{ success: boolean; order?: any; error?: string }> {
  await requireAdmin();

  if (!payment_ref || !data) {
    console.error("[createOrUpdateOrder] Missing payment_ref or data");
    return { success: false, error: "Missing payment_ref or data" };
  }

  try {
    // The backend applies the same defaults/normalisation (addresses, statuses)
    // and upserts by order number.
    const savedOrder = await apiData<any>(
      `/orders/upsert/${encodeURIComponent(payment_ref)}`,
      { method: "POST", body: data },
    );

    return { success: true, order: savedOrder };
  } catch (err: any) {
    console.error("[createOrUpdateOrder] Error saving order:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteOrder(orderNumber: string) {
  await requireAdmin();

  if (!orderNumber) {
    console.error("Missing order number");
    return null;
  }

  try {
    await apiFetch(`/orders/${encodeURIComponent(orderNumber)}`, {
      method: "DELETE",
    });

    console.log(`Order with order number ${orderNumber} deleted successfully`);
    // ✅ Fixed revalidation path to match the actual route
    revalidatePath("/sales/orders");
    return { success: true };
  } catch (error: any) {
    if (error instanceof ApiError && error.status === 404) {
      console.error(`Order with order number ${orderNumber} not found`);
      return null;
    }
    console.error("Error deleting order:", error.message);
    return null;
  }
}

export async function generateTrackingNumber(
  trackingNumber: string,
): Promise<string> {
  await requireAdmin();
  const result = await apiData<{ trackingNumber?: string }>("/orders/tracking", {
    method: "POST",
    body: { trackingNumber },
  });
  return result?.trackingNumber ?? trackingNumber;
}
