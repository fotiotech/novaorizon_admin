// lib/api/order.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";

/* ------------------------------ types ------------------------------ */

export type OrderPaymentStatus =
  | "pending"
  | "cod_pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "return_requested"
  | "returned"
  | "cancelled"
  // Legacy values from before the lifecycle model.
  | "in transit"
  | "completed";

export interface OrderAddressInput {
  street?: string;
  city?: string;
  region?: string;
  address?: string;
  country?: string;
  carrier?: string;
}

export interface OrderInput {
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

/** Order document as returned by `GET /api/orders` (plain JSON, string ids). */
export interface ApiOrder {
  _id: string;
  orderNumber: string;
  userId?: string | null;
  email?: string;
  firstName?: string;
  lastName?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  shippingCost?: number;
  discount?: number;
  paymentStatus?: OrderPaymentStatus | string;
  orderStatus?: OrderStatus | string;
  shippingStatus?: string;
  returnReason?: string | null;
  returnRequestedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  products?: any[];
  [k: string]: any;
}

export interface FindOrdersOptions {
  orderNumber?: string;
  userId?: string | null;
  page?: number;
  limit?: number;
  orderStatus?: string;
  paymentStatus?: string;
  /** Searches orderNumber, email, firstName and lastName. */
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  /** Filter by carrier name (matches `shippingAddress.carrier`). */
  carrier?: string;
}

/** Shape returned by `GET /api/orders`. */
export interface OrderListResponse {
  orders: ApiOrder[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface OrderActionResult {
  success: boolean;
  order?: ApiOrder;
  error?: string;
}

/* ----------------------------- helpers ----------------------------- */

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: string; message?: string }
      | undefined;
    return data?.error || data?.message || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

function isNotFound(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 404;
}

/** ValidationError from the backend puts the human-readable message here. */
function formError(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined;
  const data = err.response?.data as
    | { fieldErrors?: Record<string, string[]> }
    | undefined;
  return data?.fieldErrors?._form?.[0];
}

/* ------------------------------ queries ---------------------------- */

/** GET /api/orders — admin only, paginated + filtered. */
export async function findOrders(
  options: FindOrdersOptions = {},
): Promise<OrderListResponse> {
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
    carrier,
  } = options;

  const res = await api.get<{ data: OrderListResponse }>("/orders", {
    params: {
      orderNumber: orderNumber || undefined,
      userId: userId || undefined,
      page,
      limit,
      orderStatus: orderStatus || undefined,
      paymentStatus: paymentStatus || undefined,
      search: search || undefined,
      dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
      dateTo: dateTo ? dateTo.toISOString() : undefined,
      carrier: carrier || undefined,
    },
  });

  const data = res.data?.data;
  return {
    orders: data?.orders ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    currentPage: data?.currentPage ?? page,
  };
}

/* --------------------------- status updates ------------------------ */

/**
 * PATCH /api/orders/:orderNumber/status — admin only.
 * The backend also runs the paid-transition side effects (inventory
 * deduction, invoice creation) and refund transactions.
 */
export async function updateOrderStatus(
  orderNumber: string,
  updates: {
    paymentStatus?: OrderPaymentStatus;
    orderStatus?: OrderStatus;
    note?: string;
  },
): Promise<OrderActionResult> {
  if (!orderNumber) {
    return { success: false, error: "Order number is required" };
  }

  if (!updates.paymentStatus && !updates.orderStatus) {
    return { success: false, error: "At least one status must be provided" };
  }

  try {
    const res = await api.patch<{ success: boolean; data: ApiOrder }>(
      `/orders/${encodeURIComponent(orderNumber)}/status`,
      {
        paymentStatus: updates.paymentStatus,
        orderStatus: updates.orderStatus,
        note: updates.note,
      },
    );
    return { success: true, order: res.data.data };
  } catch (err) {
    if (isNotFound(err)) {
      return {
        success: false,
        error: `Order with number ${orderNumber} not found`,
      };
    }
    return { success: false, error: errorMessage(err, "Unable to update order") };
  }
}

/* ----------------------------- POS sale ---------------------------- */

/** POST /api/orders/pos — admin only. Completes the POS cart as an order. */
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
): Promise<OrderActionResult> {
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) {
    return { success: false, error: "No active POS session found." };
  }

  try {
    const res = await api.post<{ success: boolean; data: ApiOrder }>(
      "/orders/pos",
      { identifier, customer },
    );
    return { success: true, order: res.data.data };
  } catch (err) {
    return {
      success: false,
      error:
        formError(err) ||
        errorMessage(err, "Unable to complete sale."),
    };
  }
}

/* ---------------------------- returns ------------------------------ */

/** POST /api/orders/:orderNumber/return — admin only. */
export async function requestReturn(
  orderNumber: string,
  reason: string,
): Promise<OrderActionResult> {
  const normalizedReason = (reason || "Customer requested a return").trim();
  if (!orderNumber) {
    return { success: false, error: "Order number is required." };
  }

  try {
    const res = await api.post<{ success: boolean; data: ApiOrder }>(
      `/orders/${encodeURIComponent(orderNumber)}/return`,
      { reason: normalizedReason },
    );
    return { success: true, order: res.data.data };
  } catch (err) {
    if (isNotFound(err)) return { success: false, error: "Order not found." };
    return {
      success: false,
      error: errorMessage(err, "Unable to request return."),
    };
  }
}

/** POST /api/orders/:orderNumber/return/resolve — admin only. */
export async function resolveReturnRequest(
  orderNumber: string,
  action: "approve" | "reject",
  options?: { reason?: string; refundAmount?: number },
): Promise<OrderActionResult> {
  if (!orderNumber) {
    return { success: false, error: "Order number is required." };
  }

  try {
    const res = await api.post<{ success: boolean; data: ApiOrder }>(
      `/orders/${encodeURIComponent(orderNumber)}/return/resolve`,
      { action, options },
    );
    return { success: true, order: res.data.data };
  } catch (err) {
    if (isNotFound(err)) return { success: false, error: "Order not found." };
    return {
      success: false,
      error: errorMessage(err, "Unable to resolve return request."),
    };
  }
}

/* --------------------------- upsert / delete ----------------------- */

/** POST /api/orders/upsert/:paymentRef — admin only. */
export async function createOrUpdateOrder(
  payment_ref: string,
  data: Partial<OrderInput>,
): Promise<OrderActionResult> {
  if (!payment_ref || !data) {
    return { success: false, error: "Missing payment_ref or data" };
  }

  try {
    const res = await api.post<{ success: boolean; data: ApiOrder }>(
      `/orders/upsert/${encodeURIComponent(payment_ref)}`,
      data,
    );
    return { success: true, order: res.data.data };
  } catch (err) {
    return { success: false, error: errorMessage(err, "Unable to save order") };
  }
}

/**
 * DELETE /api/orders/:orderNumber — admin only.
 * Returns `null` when the order does not exist (mirrors the old action).
 */
export async function deleteOrder(
  orderNumber: string,
): Promise<{ success: boolean } | null> {
  if (!orderNumber) return null;

  try {
    await api.delete(`/orders/${encodeURIComponent(orderNumber)}`);
    return { success: true };
  } catch (err) {
    if (!isNotFound(err)) {
      console.error("Error deleting order:", errorMessage(err, "Request failed"));
    }
    return null;
  }
}

/* --------------------------- tracking ------------------------------ */

/** POST /api/orders/tracking — admin only. */
export async function generateTrackingNumber(
  trackingNumber: string,
): Promise<string> {
  const res = await api.post<{ data: { trackingNumber?: string } }>(
    "/orders/tracking",
    { trackingNumber },
  );
  return res.data?.data?.trackingNumber ?? trackingNumber;
}