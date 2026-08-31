"use server";
import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import Order from "@/models/Order";
import Invoice, { InvoiceDocument } from "@/models/Invoice";
import { revalidatePath } from "next/cache";
import "@/models/Address";
import "@/models/PaymentMethod";

/**
 * Generate a unique invoice number
 * Format: INV-YYYY-XXXXXX (date + random)
 */
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}-${random}`;
}

/**
 * Create an invoice for a paid order
 */
export async function createInvoice(
  orderNumber: string,
): Promise<{ success: boolean; invoice?: any; error?: string }> {
  await connection();

  try {
    const order: any = await Order.findOne({ orderNumber }).lean();
    if (!order) {
      return { success: false, error: "Order not found." };
    }

    if (order.paymentStatus !== "paid") {
      return {
        success: false,
        error: "Only paid orders can have invoices issued.",
      };
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ orderNumber }).lean();
    if (existingInvoice) {
      return { success: true, invoice: existingInvoice };
    }

    const invoiceNumber = generateInvoiceNumber();
    const invoice = await Invoice.create({
      invoiceNumber,
      orderNumber,
      orderId: order._id,
      userId: order.userId,
      email: order.email,
      firstName: order.firstName,
      lastName: order.lastName,
      products: order.products,
      subtotal: order.subtotal,
      tax: order.tax,
      shippingCost: order.shippingCost,
      discount: order.discount,
      total: order.total,
      billingAddress: order.billingAddress,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      status: "paid",
      issuedAt: new Date(),
      paidAt: new Date(),
    });

    revalidatePath("/sales/orders");
    return { success: true, invoice: invoice.toObject() };
  } catch (error: any) {
    console.error("[createInvoice] Error:", error);
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
  await connection();

  try {
    const invoice = await Invoice.findOne({ orderNumber }).lean();
    if (!invoice) {
      return { success: false, error: "Invoice not found." };
    }

    return { success: true, invoice };
  } catch (error: any) {
    console.error("[getInvoiceByOrderNumber] Error:", error);
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
  await connection();

  const { page = 1, limit = 10 } = options || {};

  try {
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      Invoice.find({ userId })
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments({ userId }),
    ]);

    return {
      success: true,
      invoices,
      total,
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
  await connection();

  const {
    page = 1,
    limit = 10,
    orderNumber,
    status,
    dateFrom,
    dateTo,
  } = options || {};

  try {
    let query: any = {};

    if (orderNumber) {
      query.orderNumber = new RegExp(orderNumber, "i");
    }
    if (status) {
      query.status = status;
    }
    if (dateFrom || dateTo) {
      query.issuedAt = {};
      if (dateFrom) query.issuedAt.$gte = dateFrom;
      if (dateTo) query.issuedAt.$lte = dateTo;
    }

    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort({ issuedAt: -1 }).skip(skip).limit(limit).lean(),
      Invoice.countDocuments(query),
    ]);

    return {
      success: true,
      invoices,
      total,
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
  await connection();

  try {
    const invoice = await Invoice.findOneAndUpdate(
      { invoiceNumber },
      { status: newStatus },
      { new: true },
    );

    if (!invoice) {
      return { success: false, error: "Invoice not found." };
    }

    revalidatePath("/sales/orders");
    return { success: true, invoice: invoice.toObject() };
  } catch (error: any) {
    console.error("[updateInvoiceStatus] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Download invoice data (for PDF generation on client)
 */
export async function downloadInvoice(
  invoiceNumber: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  await connection();

  try {
    const invoice: any = await Invoice.findOne({ invoiceNumber }).lean();
    if (!invoice) {
      return { success: false, error: "Invoice not found." };
    }

    return {
      success: true,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: invoice.orderNumber,
        issuedAt: new Date(invoice.issuedAt).toLocaleDateString(),
        customer: `${invoice.firstName} ${invoice.lastName}`,
        email: invoice.email,
        billingAddress: invoice.billingAddress,
        shippingAddress: invoice.shippingAddress,
        products: invoice.products,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        shippingCost: invoice.shippingCost,
        discount: invoice.discount,
        total: invoice.total,
        paymentMethod: invoice.paymentMethod,
      },
    };
  } catch (error: any) {
    console.error("[downloadInvoice] Error:", error);
    return { success: false, error: error.message };
  }
}
