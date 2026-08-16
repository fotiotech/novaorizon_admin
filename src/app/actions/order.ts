"use server";
import { connection } from "@/utils/connection";
import Order, { OrderDocument } from "@/models/Order";
import { revalidatePath } from "next/cache";
import Shipping from "@/models/Shipping";
import Transaction from "@/models/Transaction";

export async function findOrders(options?: {
  orderNumber?: string;
  userId?: string | null;
  page?: number;
  limit?: number;
}) {
  await connection();

  const { orderNumber, userId, page = 1, limit = 10 } = options || {};

  try {
    let query = {};
    if (orderNumber) {
      query = { orderNumber: new RegExp(orderNumber, "i") };
    } else if (userId) {
      query = { userId };
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("billingAddressId paymentMethodId")
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

export async function createOrUpdateOrder(
  payment_ref: string,
  data: Partial<OrderDocument>,
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

    console.log(
      `[createOrUpdateOrder] Order ${savedOrder.orderNumber} saved/updated successfully`,
    );

    if (savedOrder && savedOrder.paymentStatus === "paid") {
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

        await Order.findByIdAndUpdate(savedOrder._id, {
          shippingId: shippingRes._id,
        });
      } catch (shippingError) {
        console.error(
          "[createOrUpdateOrder] Error creating shipping:",
          shippingError,
        );
      }

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
    // ✅ Fixed revalidation path to match the actual route
    revalidatePath("/sales/orders");
    return deletedOrder;
  } catch (error: any) {
    console.error("Error deleting order:", error.message);
    return null;
  }
}

async function generateTrackingNumber(trackingNumber: string): Promise<string> {
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
