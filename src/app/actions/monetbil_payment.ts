"use server";

import { connection } from "@/utils/connection";
import { MonetbilPaymentRequest } from "@/constant/types";
import axios from "axios";
import { NextResponse } from "next/server";
import User from "@/models/User";
import Order from "@/models/Order"; // Adjust the path based on your project structure
import Shipping from "@/models/Shipping";

export async function generatePaymentLink(
  paymentData: MonetbilPaymentRequest,
): Promise<string | null> {
  try {
    const response = await axios.post(
      `https://api.monetbil.com/widget/v2.1/${paymentData.serviceKey}`,
      {
        amount: paymentData.amount,
        phone: paymentData.phone,
        locale: paymentData.locale || "en",
        operator: paymentData.operator || "CM_MTNMOBILEMONEY",
        country: "CM",
        currency: "XAF",
        item_ref: paymentData.itemRef,
        payment_ref: paymentData.itemRef,
        user: paymentData.user,
        first_name: paymentData.firstName,
        last_name: paymentData.lastName,
        email: paymentData.email,
        return_url: paymentData.returnUrl,
        notify_url: paymentData.notifyUrl,
        logo: paymentData.logo,
      },
    );

    if (response.data.success) {
      return response.data.payment_url;
    } else {
      console.error("Payment link generation failed:", response.data);
      return null;
    }
  } catch (error) {
    console.error("Error generating payment link:", error);
    return null;
  }
}

// Payment Notification Handler
export async function getPaymentNotification(request: Request) {
  try {
    // Extract query parameters from the URL
    const { searchParams } = new URL(request.url);
    console.log(searchParams);

    const transaction_id = searchParams.get("transaction_id");
    const status = searchParams.get("status");
    const amount = searchParams.get("amount");
    const currency = searchParams.get("currency");

    // Log for debugging (remove in production)
    console.log("Payment Notification:", {
      transaction_id,
      status,
      amount,
      currency,
    });

    // Validate received data
    if (!transaction_id || !status) {
      return NextResponse.json(
        { error: "Invalid notification data" },
        { status: 400 },
      );
    }

    // Handle successful payment
    if (status === "success") {
      console.log(`Payment succeeded for transaction_id: ${transaction_id}`);

      // Update payment status in the database
      // await updateOrderStatus(transaction_id, "paid");

      return NextResponse.json(
        { message: "Payment successful and processed" },
        { status: 200 },
      );
    }

    // Handle failed payment
    if (status === "failed") {
      console.log(`Payment failed for transaction_id: ${transaction_id}`);

      // Update payment status in the database
      // await updateOrderStatus(transaction_id, "failed");

      return NextResponse.json(
        { message: "Payment failed and logged" },
        { status: 200 },
      );
    }

    // Handle unexpected status
    return NextResponse.json(
      { error: "Unknown payment status" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error handling payment notification:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function updateOrderStatus(
  payment_ref: string,
  transaction_id: string,
  status: string,
) {
  if (!payment_ref || !transaction_id || !status) return null;
  try {
    await connection();
    const savedOrder = await Order.findOneAndUpdate(
      { orderNumber: payment_ref },
      { transaction_id, paymentStatus: status },
      { new: true },
    );
    if (!savedOrder) {
      throw new Error("Order not found");
    }
    if (savedOrder && savedOrder.paymentStatus === "cancelled") {
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
        trackingNumber: savedOrder.orderNumber,
        shippingCost: savedOrder.shippingCost || 2,
        status: "pending",
      });
      await createShipping.save();
    }
  } catch (error) {
    console.error("Error updating order status:", error);
  }
}
