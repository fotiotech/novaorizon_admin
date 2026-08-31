"use server";
import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import Order, { OrderDocument } from "@/models/Order";
import { revalidatePath } from "next/cache";
import Shipping from "@/models/Shipping";
import Transaction from "@/models/Transaction";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import Invoice from "@/models/Invoice";
import "@/models/Address";
import "@/models/PaymentMethod";

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
  await connection();

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
    let query: any = {};

    // Exact orderNumber match (if provided)
    if (orderNumber) {
      query.orderNumber = new RegExp(orderNumber, "i");
    }

    // User filter
    if (userId) {
      query.userId = userId;
    }

    // Status filters
    if (orderStatus) {
      query.orderStatus = orderStatus;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = dateFrom;
      if (dateTo) query.createdAt.$lte = dateTo;
    }

    // Search across orderNumber, email, firstName, lastName
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { orderNumber: searchRegex },
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
      ];
    }

    // Carrier filter: match shippingAddress.carrier
    if (carrier) {
      query["shippingAddress.carrier"] = carrier;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("billingAddressId paymentMethodId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders: orders.map((order) => ({
        ...order,
        _id: order._id.toString(),
        userId: order.userId.toString(),
      })),
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error: any) {
    console.error(`Error fetching orders: ${error.message}`);
    throw error;
  }
}
export async function updateOrderStatus(
  orderNumber: string,
  updates: {
    paymentStatus?: OrderDocument["paymentStatus"];
    orderStatus?: OrderDocument["orderStatus"];
  },
): Promise<{ success: boolean; order?: any; error?: string }> {
  await connection();

  if (!orderNumber) {
    return { success: false, error: "Order number is required" };
  }

  if (!updates.paymentStatus && !updates.orderStatus) {
    return { success: false, error: "At least one status must be provided" };
  }

  try {
    // Build update object
    const updateFields: any = {};
    if (updates.paymentStatus)
      updateFields.paymentStatus = updates.paymentStatus;
    if (updates.orderStatus) updateFields.orderStatus = updates.orderStatus;

    // Use findOneAndUpdate with $set and skip validation (safe for status updates)
    const order = await Order.findOneAndUpdate(
      { orderNumber },
      { $set: updateFields },
      { new: true, runValidators: false }, // ⬅️ Skip validation to avoid missing billingAddress error
    );

    if (!order) {
      return {
        success: false,
        error: `Order with number ${orderNumber} not found`,
      };
    }

    // If paymentStatus becomes "paid", create an invoice
    if (updates.paymentStatus === "paid") {
      try {
        const existingInvoice = await Invoice.findOne({
          orderNumber: order.orderNumber,
        }).lean();
        if (!existingInvoice) {
          const year = new Date().getFullYear();
          const random = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();
          const invoiceNumber = `INV-${year}-${random}`;
          await Invoice.create({
            invoiceNumber,
            orderNumber: order.orderNumber,
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
        }
      } catch (invoiceError) {
        console.error(
          "[updateOrderStatus] Error creating invoice:",
          invoiceError,
        );
      }
    }

    // If paymentStatus becomes "refunded", create a refund transaction
    if (updates.paymentStatus === "refunded") {
      try {
        const refundTransaction = new Transaction({
          orderId: order._id,
          userId: order.userId,
          amount: order.total,
          type: "refund",
          description: `Refund for order #${order.orderNumber}`,
          status: "completed",
          paymentMethod: order.paymentMethod,
          date: new Date(),
        });
        await refundTransaction.save();
      } catch (refundError) {
        console.error(
          "[updateOrderStatus] Error creating refund transaction:",
          refundError,
        );
      }
    }

    // Revalidate relevant paths
    revalidatePath("/sales/orders");
    // Optionally revalidate carrier detail pages (if we know the carrier, but it's not in scope)
    // The client will refresh via router.refresh()

    return { success: true, order: order.toObject() };
  } catch (error: any) {
    console.error("[updateOrderStatus] Error:", error.message);
    return { success: false, error: error.message };
  }
}

function getProductQuantity(product: any) {
  return Number(
    product?.quantity ?? product?.stock_quantity ?? product?.stockQuantity ?? 0,
  );
}

export async function completePOSOrder(
  identifier: { userId?: string; sessionId?: string },
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    paymentMethod?: string;
    notes?: string;
  },
): Promise<{ success: boolean; order?: any; error?: string }> {
  await connection();

  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) {
    return { success: false, error: "No active POS session found." };
  }

  try {
    const cart: any = await Cart.findOne({
      ...(userId ? { userId } : { sessionId }),
    }).lean();

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return { success: false, error: "Cart is empty." };
    }

    const orderProducts: any[] = [];

    for (const item of cart.items) {
      const product: any = await Product.findById(item.productId).lean();
      if (!product) {
        return {
          success: false,
          error: "One of the products in the cart no longer exists.",
        };
      }

      const availableQty = getProductQuantity(product);
      if (Number(item.quantity || 0) > availableQty) {
        return {
          success: false,
          error: `Insufficient quantity for ${product.title || "selected product"}. Only ${availableQty} available.`,
        };
      }

      orderProducts.push({
        productId: item.productId,
        name: product.title || "Product",
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
      });
    }

    const order = await Order.create({
      orderNumber: `POS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      userId: userId
        ? new mongoose.Types.ObjectId(userId)
        : new mongoose.Types.ObjectId(),
      email: customer?.email || "pos@local",
      firstName: customer?.firstName || "POS",
      lastName: customer?.lastName || "Customer",
      products: orderProducts,
      subtotal: Number(cart.subtotal || 0),
      tax: Number(cart.tax || 0),
      shippingCost: Number(cart.shippingCost || 0),
      total: Number(cart.total || 0),
      paymentStatus: "paid",
      paymentMethod: customer?.paymentMethod || "cash",
      billingAddress: {
        street: "",
        city: "",
        region: "",
        address: "",
        country: "",
      },
      shippingAddress: {
        street: "",
        city: "",
        region: "",
        address: "",
        country: "",
        carrier: "POS",
      },
      shippingStatus: "pending",
      orderStatus: "completed",
      discount: Number(cart.discount || 0),
      notes:
        customer?.notes || `POS sale via ${sessionId || userId || "guest"}`,
    });

    for (const item of cart.items) {
      const product: any = await Product.findById(item.productId);
      if (!product) continue;

      const currentQty = getProductQuantity(product);
      const nextQty = Math.max(0, currentQty - Number(item.quantity || 0));

      product.quantity = nextQty;
      product.stock_quantity = nextQty;
      product.stockQuantity = nextQty;

      if (nextQty <= 0) {
        product.stockStatus = "out_of_stock";
        product.stock_status = "out_of_stock";
      } else if (
        nextQty <=
        Number(product.lowStockThreshold ?? product.low_stock_threshold ?? 10)
      ) {
        product.stockStatus = "low_stock";
        product.stock_status = "low_stock";
      } else {
        product.stockStatus = "in_stock";
        product.stock_status = "in_stock";
      }

      product.lastInventoryUpdate = new Date();
      product.last_inventory_update = product.lastInventoryUpdate;
      await product.save();
    }

    await Cart.deleteOne({ _id: cart._id });

    revalidatePath("/pos");
    revalidatePath("/sales/orders");
    revalidatePath("/inventory");

    return { success: true, order: order.toObject() };
  } catch (error: any) {
    console.error("[completePOSOrder] Error:", error);
    return {
      success: false,
      error: error.message || "Unable to complete sale.",
    };
  }
}

export async function requestReturn(
  orderNumber: string,
  reason: string,
): Promise<{ success: boolean; error?: string; order?: any }> {
  await connection();

  const normalizedReason = (reason || "Customer requested a return").trim();
  if (!orderNumber) {
    return { success: false, error: "Order number is required." };
  }

  try {
    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return { success: false, error: "Order not found." };
    }

    if (
      ["returned", "cancelled", "return_requested"].includes(order.orderStatus)
    ) {
      return {
        success: false,
        error: "This order is already in a return or cancellation flow.",
      };
    }

    if (order.paymentStatus !== "paid") {
      return {
        success: false,
        error: "Only paid orders can be returned or refunded.",
      };
    }

    const updated = await Order.findOneAndUpdate(
      { orderNumber },
      {
        $set: {
          orderStatus: "return_requested",
          returnReason: normalizedReason,
          returnRequestedAt: new Date(),
        },
      },
      { new: true },
    );

    revalidatePath("/sales/refunds");
    return { success: true, order: updated?.toObject() };
  } catch (error: any) {
    console.error("[requestReturn] Error:", error);
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
  await connection();

  if (!orderNumber) {
    return { success: false, error: "Order number is required." };
  }

  try {
    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return { success: false, error: "Order not found." };
    }

    if (action === "approve") {
      const refundAmount = Number(options?.refundAmount ?? order.total ?? 0);
      const updated = await Order.findOneAndUpdate(
        { orderNumber },
        {
          $set: {
            orderStatus: "returned",
            paymentStatus: "refunded",
            refundAmount,
            refundedAt: new Date(),
            returnReason:
              options?.reason || order.returnReason || "Approved by admin",
          },
        },
        { new: true },
      );

      const refundTransaction = new Transaction({
        orderId: order._id,
        userId: order.userId,
        amount: refundAmount,
        type: "refund",
        description: `Refund approved for order #${order.orderNumber}`,
        status: "completed",
        paymentMethod: order.paymentMethod,
        date: new Date(),
      });
      await refundTransaction.save();

      for (const item of order.products || []) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        const currentQty = getProductQuantity(product);
        const restoredQty = Math.max(
          0,
          currentQty + Number(item.quantity || 0),
        );
        product.quantity = restoredQty;
        product.stock_quantity = restoredQty;
        product.stockQuantity = restoredQty;

        if (restoredQty <= 0) {
          product.stockStatus = "out_of_stock";
          product.stock_status = "out_of_stock";
        } else if (
          restoredQty <=
          Number(product.lowStockThreshold ?? product.low_stock_threshold ?? 10)
        ) {
          product.stockStatus = "low_stock";
          product.stock_status = "low_stock";
        } else {
          product.stockStatus = "in_stock";
          product.stock_status = "in_stock";
        }

        product.lastInventoryUpdate = new Date();
        product.last_inventory_update = product.lastInventoryUpdate;
        await product.save();
      }

      revalidatePath("/sales/refunds");
      revalidatePath("/sales/orders");
      return { success: true, order: updated?.toObject() };
    }

    const updated = await Order.findOneAndUpdate(
      { orderNumber },
      {
        $set: {
          orderStatus: "completed",
          returnReason:
            options?.reason || order.returnReason || "Return rejected by admin",
        },
      },
      { new: true },
    );

    revalidatePath("/sales/refunds");
    return { success: true, order: updated?.toObject() };
  } catch (error: any) {
    console.error("[resolveReturnRequest] Error:", error);
    return {
      success: false,
      error: error.message || "Unable to resolve return request.",
    };
  }
}

export async function createOrUpdateOrder(
  payment_ref: string,
  data: Partial<OrderDocument>,
): Promise<{ success: boolean; order?: any; error?: string }> {
  await connection();

  if (!payment_ref || !data) {
    console.error("[createOrUpdateOrder] Missing payment_ref or data");
    return { success: false, error: "Missing payment_ref or data" };
  }

  const {
    tax = 0,
    shippingCost = 0,
    paymentStatus = "pending",
    shippingStatus = "pending",
    orderStatus = "processing",
    discount = 0,
    shippingAddress = {
      street: "",
      city: "",
      region: "",
      address: "",
      country: "",
      carrier: "Novaorizon",
    },
    billingAddress = {
      street: "",
      city: "",
      region: "",
      address: "",
      country: "",
    },
    billingAddressId,
    paymentMethodId,
    ...rest
  } = data;

  const payload: any = {
    ...rest,
    orderNumber: payment_ref,
    tax,
    shippingCost,
    paymentStatus,
    shippingStatus,
    orderStatus,
    discount,
    shippingAddress: {
      street: shippingAddress.street || "",
      region: shippingAddress.region || "",
      city: shippingAddress.city || "",
      address: shippingAddress.address || "",
      carrier: shippingAddress.carrier || "Novaorizon",
      country: shippingAddress.country || "",
    },
    billingAddress: {
      street: billingAddress.street || "",
      city: billingAddress.city || "",
      region: billingAddress.region || "",
      address: billingAddress.address || "",
      country: billingAddress.country || "",
    },
    billingAddressId: billingAddressId || null,
    paymentMethodId: paymentMethodId || null,
  };

  try {
    const savedOrder = await Order.findOneAndUpdate(
      { orderNumber: payment_ref },
      payload,
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    return { success: true, order: savedOrder };
  } catch (err: any) {
    console.error("[createOrUpdateOrder] Error saving order:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteOrder(orderNumber: string) {
  await connection();

  if (!orderNumber) {
    console.error("Missing order number");
    return null;
  }

  try {
    const deletedOrder = await Order.findOneAndDelete({ orderNumber });

    if (!deletedOrder) {
      console.error(`Order with order number ${orderNumber} not found`);
      return null;
    }

    console.log(`Order with order number ${orderNumber} deleted successfully`);
    // ✅ Fixed revalidation path to match the actual route
    revalidatePath("/sales/orders");
    return deletedOrder;
  } catch (error: any) {
    console.error("Error deleting order:", error.message);
    return null;
  }
}

export async function generateTrackingNumber(
  trackingNumber: string,
): Promise<string> {
  const existing = await Shipping.findOne({ trackingNumber });
  if (existing) {
    return trackingNumber;
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < 10; i++) {
    trackingNumber += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return trackingNumber;
}
