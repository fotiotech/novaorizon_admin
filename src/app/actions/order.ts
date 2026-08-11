"use server";
import { connection } from "@/utils/connection";
import Order from "@/models/Order";
import { revalidatePath } from "next/cache";
import Shipping from "@/models/Shipping";
import "@/models/User";
import Transaction from "@/models/Transaction";
import { Order as OrderT } from "@/constant/types/finance";

interface FindOrdersOptions {
  orderNumber?: string;
  userId?: string | null;
  page?: number;
  limit?: number;
}

// For single order lookup, returns the order object or null
// For list (with or without userId) returns paginated result with { orders, total, page, totalPages }
export async function findOrders(options: FindOrdersOptions = {}) {
  const { orderNumber, userId, page = 1, limit = 10 } = options;
  await connection();

  try {
    // If orderNumber is provided, return single order (exact match)
    if (orderNumber) {
      const order = await Order.findOne({ orderNumber }).lean();
      if (!order) return null;
      return {
        ...order,
        _id: order._id.toString(),
        userId: order.userId?.toString(),
        transactionId: order.transaction_id,
      };
    }

    // Build query for list
    const query: any = {};
    if (userId) {
      query.userId = userId;
    }

    // If no userId and no orderNumber, get all (paginated)
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query).skip(skip).limit(limit).lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders: orders.map((order) => ({
        ...order,
        _id: order._id.toString(),
        userId: order.userId?.toString(),
        transactionId: order.transaction_id,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error: any) {
    console.error(`Error fetching orders: ${error.message}`);
    throw error;
  }
}

export async function createOrUpdateOrder(
  payment_ref: string,
  data: OrderT,
): Promise<{ success: boolean; order?: any; error?: string }> {
  await connection();

  if (!payment_ref || !data) {
    console.error("[createOrUpdateOrder] Missing payment_ref or data");
    return { success: false, error: "Missing payment_ref or data" };
  }

  console.log(
    `[createOrUpdateOrder] Creating/updating order with orderNumber: ${payment_ref}`,
  );

  const {
    tax = 0,
    shippingCost = 0,
    paymentStatus = "pending",
    shippingStatus = "pending",
    orderStatus = "processing",
    discount = 0,
    userId,
    shippingAddress = {
      street: "",
      city: "",
      region: "",
      address: "",
      country: "",
      carrier: "Novaorizon",
    },
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
    userId,
    shippingAddress: {
      street: shippingAddress.street || "",
      region: shippingAddress.region || "",
      city: shippingAddress.city || "",
      address: shippingAddress.address || "",
      carrier: shippingAddress.carrier || "Novaorizon",
      country: shippingAddress.country || "",
    },
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

    console.log(
      `[createOrUpdateOrder] Order ${savedOrder._id} saved/updated successfully`,
    );

    // --- FIX: Create shipping and transaction ONLY when payment is PAID (not cancelled) ---
    if (savedOrder && savedOrder.paymentStatus === "paid") {
      // Create shipping record
      try {
        const createShipping = new Shipping({
          orderId: savedOrder._id,
          userId: savedOrder.userId,
          address: {
            street: savedOrder.shippingAddress.street,
            city: savedOrder.shippingAddress.city,
            region: savedOrder.shippingAddress.region,
            address: savedOrder.shippingAddress.address,
            country: savedOrder.shippingAddress.country,
            carrier: savedOrder.shippingAddress.carrier || "Novaorizon",
          },
          trackingNumber: await generateTrackingNumber(payment_ref),
          shippingCost: savedOrder.shippingCost || 0,
          status: "processing",
        });

        const shippingRes = await createShipping.save();
        console.log(
          `Shipping created for order ${savedOrder.orderNumber}:`,
          shippingRes,
        );

        // Update order with shipping reference
        await Order.findByIdAndUpdate(savedOrder._id, {
          shippingId: shippingRes._id,
        });
      } catch (shippingError) {
        console.error(
          "[createOrUpdateOrder] Error creating shipping:",
          shippingError,
        );
      }

      // Create transaction record
      try {
        const existingTransaction = await Transaction.findOne({
          orderId: savedOrder._id,
        });

        if (!existingTransaction) {
          const createTransaction = new Transaction({
            orderId: savedOrder._id,
            userId: savedOrder.userId,
            amount: savedOrder.total,
            type: "income",
            description: `Payment for order #${savedOrder.orderNumber}`,
            status: "completed",
            paymentMethod: savedOrder.paymentMethod,
            date: new Date(),
          });

          const transactionRes = await createTransaction.save();
          console.log(
            `Transaction created for order ${savedOrder.orderNumber}:`,
            transactionRes,
          );
        } else {
          await Transaction.findByIdAndUpdate(existingTransaction._id, {
            status: "completed",
            amount: savedOrder.total,
          });
          console.log(
            `Transaction updated for order ${savedOrder.orderNumber}`,
          );
        }
      } catch (transactionError) {
        console.error(
          "[createOrUpdateOrder] Error creating transaction:",
          transactionError,
        );
      }
    }

    // Handle refunds
    if (savedOrder && savedOrder.paymentStatus === "refunded") {
      try {
        const refundTransaction = new Transaction({
          orderId: savedOrder._id,
          userId: savedOrder.userId,
          amount: savedOrder.total,
          type: "refund",
          description: `Refund for order #${savedOrder.orderNumber}`,
          status: "completed",
          paymentMethod: savedOrder.paymentMethod,
          date: new Date(),
        });

        await refundTransaction.save();
        console.log(
          `Refund transaction created for order ${savedOrder.orderNumber}`,
        );
      } catch (refundError) {
        console.error(
          "[createOrUpdateOrder] Error creating refund transaction:",
          refundError,
        );
      }
    }

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
    revalidatePath("/orders"); // adjust path to match your routes
    return true;
  } catch (error: any) {
    console.error("Error deleting order:", error.message);
    return null;
  }
}

// Improved tracking number generator
async function generateTrackingNumber(base: string): Promise<string> {
  // Generate a unique tracking number: base + timestamp + random
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  let tracking = `${base}-${timestamp}-${random}`;

  // Ensure uniqueness
  let existing = await Shipping.findOne({ trackingNumber: tracking });
  let attempt = 0;
  while (existing && attempt < 5) {
    const extra = Math.random().toString(36).substring(2, 5).toUpperCase();
    tracking = `${base}-${timestamp}-${random}-${extra}`;
    existing = await Shipping.findOne({ trackingNumber: tracking });
    attempt++;
  }
  return tracking;
}
