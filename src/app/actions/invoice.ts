"use server";

import { requireAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { ApiError, apiData } from "@/lib/server-api";

/**
 * Create an invoice for a paid order
 */
export async function createInvoice(
  orderNumber: string,
): Promise<{ success: boolean; invoice?: any; error?: string }> {
  await requireAdmin();

  try {
    const invoice = await apiData<any>(
      `/invoices/order/${encodeURIComponent(orderNumber)}`,
      { method: "POST" },
    );

    revalidatePath("/sales/orders");
    return { success: true, invoice };
  } catch (error: any) {
    console.error("[createInvoice] Error:", error);
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Order not found." };
    }
    return {
      success: false,
      error: error.message || "Unable to create invoice.",
    };
  }
}

/**
 * Fetch invoice by order number
 */
export async function getInvoiceByOrderNumber(
  orderNumber: string,
): Promise<{ success: boolean; invoice?: any; error?: string }> {
  await requireAdmin();

  try {
    const invoice = await apiData<any>(
      `/invoices/order/${encodeURIComponent(orderNumber)}`,
    );

    return { success: true, invoice };
  } catch (error: any) {
    console.error("[getInvoiceByOrderNumber] Error:", error);
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Invoice not found." };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all invoices for a user
 */
export async function getInvoicesByUserId(
  userId: string,
  options?: { page?: number; limit?: number },
): Promise<{
  success: boolean;
  invoices?: any[];
  total?: number;
  error?: string;
}> {
  await requireAdmin();

  const { page = 1, limit = 10 } = options || {};

  try {
    const result = await apiData<{ invoices?: any[]; total?: number }>(
      `/invoices/user/${encodeURIComponent(userId)}`,
      { query: { page, limit } },
    );

    return {
      success: true,
      invoices: result?.invoices ?? [],
      total: result?.total ?? 0,
    };
  } catch (error: any) {
    console.error("[getInvoicesByUserId] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all invoices (admin)
 */
export async function findInvoices(options?: {
  page?: number;
  limit?: number;
  orderNumber?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<{
  success: boolean;
  invoices?: any[];
  total?: number;
  error?: string;
}> {
  await requireAdmin();

  const {
    page = 1,
    limit = 10,
    orderNumber,
    status,
    dateFrom,
    dateTo,
  } = options || {};

  try {
    const result = await apiData<{ invoices?: any[]; total?: number }>(
      "/invoices",
      {
        query: {
          page,
          limit,
          orderNumber,
          status,
          dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
          dateTo: dateTo ? dateTo.toISOString() : undefined,
        },
      },
    );

    return {
      success: true,
      invoices: result?.invoices ?? [],
      total: result?.total ?? 0,
    };
  } catch (error: any) {
    console.error("[findInvoices] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update invoice status (e.g., mark as cancelled)
 */
export async function updateInvoiceStatus(
  invoiceNumber: string,
  newStatus: "issued" | "paid" | "cancelled",
): Promise<{ success: boolean; invoice?: any; error?: string }> {
  await requireAdmin();

  try {
    const invoice = await apiData<any>(
      `/invoices/${encodeURIComponent(invoiceNumber)}/status`,
      { method: "PATCH", body: { status: newStatus } },
    );

    revalidatePath("/sales/orders");
    return { success: true, invoice };
  } catch (error: any) {
    console.error("[updateInvoiceStatus] Error:", error);
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Invoice not found." };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Download invoice data (for PDF generation on client)
 */
export async function downloadInvoice(
  invoiceNumber: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  await requireAdmin();

  try {
    const data = await apiData<any>(
      `/invoices/${encodeURIComponent(invoiceNumber)}/download`,
    );

    return { success: true, data };
  } catch (error: any) {
    console.error("[downloadInvoice] Error:", error);
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Invoice not found." };
    }
    return { success: false, error: error.message };
  }
}
