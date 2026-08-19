"use server";
import { connection } from "@/utils/connection";
import Order, { OrderDocument } from "@/models/Order";
import { revalidatePath } from "next/cache";
import Shipping from "@/models/Shipping";
import Transaction from "@/models/Transaction";
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
  }
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
    if (updates.paymentStatus) updateFields.paymentStatus = updates.paymentStatus;
    if (updates.orderStatus) updateFields.orderStatus = updates.orderStatus;

    // Use findOneAndUpdate with $set and skip validation (safe for status updates)
    const order = await Order.findOneAndUpdate(
      { orderNumber },
      { $set: updateFields },
      { new: true, runValidators: false } // ⬅️ Skip validation to avoid missing billingAddress error
    );

    if (!order) {
      return { success: false, error: `Order with number ${orderNumber} not found` };
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
        console.error("[updateOrderStatus] Error creating refund transaction:", refundError);
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

export async function generateTrackingNumber(trackingNumber: string): Promise<string> {
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
