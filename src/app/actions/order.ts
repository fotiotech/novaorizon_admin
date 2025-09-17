"use server";
import { connection } from "@/utils/connection";
import Order from "@/models/Order";
import { revalidatePath } from "next/cache";
import Shipping from "@/models/Shipping";
import "@/models/User";
import Transaction from "@/models/Transaction";
import { Order as OrderT } from "@/constant/types/finance";

export async function findOrders(orderNumber?: string, userId?: string | null) {
  await connection();

  try {
    if (orderNumber !== undefined && orderNumber !== null) {
      // Explicitly check for non-null and non-undefined values
      const regex = new RegExp(orderNumber, "i"); // Case-insensitive regex
      const order = await Order.findOne({
        orderNumber: { $regex: regex },
      });
      if (order) {
        return {
          ...order.toObject(),
          _id: order._id.toString(),
          userId: order.userId.toString(),
        };
      }
      // Explicitly return null if no order is found
    } else if (userId) {
      // Find all orders for a specific user by user ID
      const orders = await Order.find({ userId });
      return orders.map((order) => ({
        ...order.toObject(),
        _id: order._id.toString(),
        userId: order.userId.toString(),
      }));
    } else {
      // Return all orders (usually for admin view)
      const orders = await Order.find();
      return orders.map((order) => ({
        ...order.toObject(),
        _id: order._id.toString(),
        userId: order.userId.toString(),
      }));
    }
  } catch (error: any) {
    console.error(`Error fetching orders: ${error.message}`);
    throw error; // Re-throw the error for proper handling
  }
}

export async function createOrUpdateOrder(
  payment_ref: string,
  data: OrderT
): Promise<{ success: boolean; order?: any; error?: string }> {
  await connection();

  if (!payment_ref || !data) {
    console.error("[createOrUpdateOrder] Missing payment_ref or data");
    return { success: false, error: "Missing payment_ref or data" };
  }

  console.log(
    `[createOrUpdateOrder] Creating/updating order with orderNumber: ${payment_ref}`
  );

  // Destructure with defaults
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
      }
    );

    console.log(
      `[createOrUpdateOrder] Order ${savedOrder._id} saved/updated successfully`
    );

    // Create shipping record for PAID orders
    if (savedOrder && savedOrder.paymentStatus === "cancelled") {
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
          shippingRes
        );

        // Update order with shipping reference
        await Order.findByIdAndUpdate(savedOrder._id, {
          shippingId: shippingRes._id,
        });
      } catch (shippingError) {
        console.error(
          "[createOrUpdateOrder] Error creating shipping:",
          shippingError
        );
        // Don't fail the whole operation if shipping creation fails
      }

      // Create transaction record for paid orders
      try {
        // Check if transaction already exists for this order
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
            transactionRes
          );
        } else {
          // Update existing transaction if needed
          await Transaction.findByIdAndUpdate(existingTransaction._id, {
            status: "completed",
            amount: savedOrder.total,
          });
          console.log(
            `Transaction updated for order ${savedOrder.orderNumber}`
          );
        }
      } catch (transactionError) {
        console.error(
          "[createOrUpdateOrder] Error creating transaction:",
          transactionError
        );
        // Don't fail the whole operation if transaction creation fails
      }
    }

    // Handle refunds
    if (savedOrder && savedOrder.paymentStatus === "refunded") {
      try {
        // Create refund transaction
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
          `Refund transaction created for order ${savedOrder.orderNumber}`
        );
      } catch (refundError) {
        console.error(
          "[createOrUpdateOrder] Error creating refund transaction:",
          refundError
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
    // Find and delete the order by its orderNumber
    const deletedOrder = await Order.findOneAndDelete({ orderNumber });

    if (!deletedOrder) {
      console.error(`Order with order number ${orderNumber} not found`);
      return null;
    }

    console.log(`Order with order number ${orderNumber} deleted successfully`);
    revalidatePath("/admin/orders");
  } catch (error: any) {
    console.error("Error deleting order:", error.message);
    return null;
  }
}

async function generateTrackingNumber(trackingNumber: string): Promise<string> {
  // Check if this tracking number already exists
  const existing = await Shipping.findOne({ trackingNumber });
  if (existing) {
    // If it exists, generate a new one recursively
    return trackingNumber;
  }
  // Generate a random tracking number (you can customize this as needed)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (let i = 0; i < 10; i++) {
    trackingNumber += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return trackingNumber;
}
