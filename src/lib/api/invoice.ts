// lib/api/invoice.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";

/* ------------------------------ types ------------------------------ */

export type InvoiceStatus = "issued" | "paid" | "cancelled";

/** Invoice document as returned by the backend (plain JSON, string ids). */
export interface ApiInvoice {
  _id: string;
  invoiceNumber: string;
  orderNumber: string;
  status?: InvoiceStatus | string;
  issuedAt?: string;
  products?: any[];
  subtotal?: number;
  tax?: number;
  shippingCost?: number;
  discount?: number;
  total?: number;
  [k: string]: any;
}

export interface InvoiceActionResult {
  success: boolean;
  invoice?: ApiInvoice;
  error?: string;
}

export interface InvoiceListResult {
  success: boolean;
  invoices?: ApiInvoice[];
  total?: number;
  error?: string;
}

/** Payload returned by `GET /api/invoices/:invoiceNumber/download`. */
export interface InvoiceDownloadData {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: string;
  customer: string;
  email: string;
  billingAddress: any;
  shippingAddress: any;
  products: any[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentMethod: string;
  [k: string]: any;
}

export interface InvoiceDownloadResult {
  success: boolean;
  data?: InvoiceDownloadData;
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

/* ------------------------------- CRUD ------------------------------ */

/** POST /api/invoices/order/:orderNumber — admin only. */
export async function createInvoice(
  orderNumber: string,
): Promise<InvoiceActionResult> {
  try {
    const res = await api.post<{ success: boolean; data: ApiInvoice }>(
      `/invoices/order/${encodeURIComponent(orderNumber)}`,
    );
    return { success: true, invoice: res.data.data };
  } catch (err) {
    if (isNotFound(err)) return { success: false, error: "Order not found." };
    return {
      success: false,
      error: errorMessage(err, "Unable to create invoice."),
    };
  }
}

/** GET /api/invoices/order/:orderNumber — admin only. */
export async function getInvoiceByOrderNumber(
  orderNumber: string,
): Promise<InvoiceActionResult> {
  try {
    const res = await api.get<{ success: boolean; data: ApiInvoice }>(
      `/invoices/order/${encodeURIComponent(orderNumber)}`,
    );
    return { success: true, invoice: res.data.data };
  } catch (err) {
    if (isNotFound(err)) return { success: false, error: "Invoice not found." };
    return { success: false, error: errorMessage(err, "Unable to load invoice.") };
  }
}

/** GET /api/invoices/user/:userId — admin only, paginated. */
export async function getInvoicesByUserId(
  userId: string,
  options: { page?: number; limit?: number } = {},
): Promise<InvoiceListResult> {
  const { page = 1, limit = 10 } = options;

  try {
    const res = await api.get<{
      success: boolean;
      data: { invoices?: ApiInvoice[]; total?: number };
    }>(`/invoices/user/${encodeURIComponent(userId)}`, {
      params: { page, limit },
    });

    return {
      success: true,
      invoices: res.data?.data?.invoices ?? [],
      total: res.data?.data?.total ?? 0,
    };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, "Unable to load invoices."),
    };
  }
}

/** GET /api/invoices — admin only, paginated + filtered. */
export async function findInvoices(
  options: {
    page?: number;
    limit?: number;
    orderNumber?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {},
): Promise<InvoiceListResult> {
  const { page = 1, limit = 10, orderNumber, status, dateFrom, dateTo } = options;

  try {
    const res = await api.get<{
      success: boolean;
      data: { invoices?: ApiInvoice[]; total?: number };
    }>("/invoices", {
      params: {
        page,
        limit,
        orderNumber: orderNumber || undefined,
        status: status || undefined,
        dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
        dateTo: dateTo ? dateTo.toISOString() : undefined,
      },
    });

    return {
      success: true,
      invoices: res.data?.data?.invoices ?? [],
      total: res.data?.data?.total ?? 0,
    };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, "Unable to load invoices."),
    };
  }
}

/** PATCH /api/invoices/:invoiceNumber/status — admin only. */
export async function updateInvoiceStatus(
  invoiceNumber: string,
  newStatus: InvoiceStatus,
): Promise<InvoiceActionResult> {
  try {
    const res = await api.patch<{ success: boolean; data: ApiInvoice }>(
      `/invoices/${encodeURIComponent(invoiceNumber)}/status`,
      { status: newStatus },
    );
    return { success: true, invoice: res.data.data };
  } catch (err) {
    if (isNotFound(err)) return { success: false, error: "Invoice not found." };
    return {
      success: false,
      error: errorMessage(err, "Unable to update invoice."),
    };
  }
}

/** GET /api/invoices/:invoiceNumber/download — admin only. */
export async function downloadInvoice(
  invoiceNumber: string,
): Promise<InvoiceDownloadResult> {
  try {
    const res = await api.get<{
      success: boolean;
      data: InvoiceDownloadData;
    }>(`/invoices/${encodeURIComponent(invoiceNumber)}/download`);
    return { success: true, data: res.data.data };
  } catch (err) {
    if (isNotFound(err)) return { success: false, error: "Invoice not found." };
    return {
      success: false,
      error: errorMessage(err, "Unable to download invoice."),
    };
  }
}
