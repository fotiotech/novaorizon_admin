"use server";

// CRUD Operations for Shipping

import { connection } from "@/utils/connection";
import Shipping from "@/models/Shipping";
import Order from "@/models/Order";

// Create a new Shipping entry
export async function createShipping(data: any) {
  await connection();
  const shipping = new Shipping(data);
  return await shipping.save();
}

// Get a single Shipping entry by ID
export async function getShippingById(id: string) {
  await connection();
  return await Shipping.findById(id).exec();
}

// Get all Shipping entries (optional: add filter logic later)
export async function getAllShippings() {
  await connection();
  return await Shipping.find({}).exec();
}

// Update a Shipping entry by ID
export async function updateShipping(id: string, data: any) {
  await connection();
  let response;
  const shipping = await Shipping.findById(id).exec();
  if (!shipping) {
    throw new Error(`Shipping entry with ID ${id} not found`);
  }
  // Update the shipping entry with the provided data
  if (shipping.status === "pending" && data.status === "cancelled") {
    const res = await Shipping.findByIdAndUpdate(
      id,
      { status: data.status },
      { new: true }
    ).exec();
    response = { success: true, data: res };
  } else if (shipping.status === "pending" && data.status === "assigned") {
    const res = await Shipping.findByIdAndUpdate(id, data, {
      new: true,
    }).exec();
    response = { success: true, data: res };
  } else if (shipping.status === "assigned" && data.status === "in-transit") {
    const res = await Shipping.findByIdAndUpdate(
      id,
      { status: data.status },
      { new: true }
    ).exec();
    response = { success: true, data: res };
  } else if (shipping.status === "in-transit" && data.status === "delivered") {
    const res = await Shipping.findByIdAndUpdate(
      id,
      { status: data.status },
      { new: true }
    ).exec();
    response = { success: true, data: res };
  } else if (shipping.status === "delivered" && data.status === "completed") {
    const res = await Shipping.findByIdAndUpdate(
      id,
      { status: data.status },
      { new: true }
    ).exec();
    response = { success: true, data: res };
  } else if (shipping.status === "delivered" && data.status === "returned") {
    const res = await Shipping.findByIdAndUpdate(
      id,
      { status: data.status, returnReason: data.returnReason },
      { new: true }
    ).exec();
    response = { success: true, data: res };
  } else {
    response = {
      success: false,
      data: `Invalid status transition from ${shipping.status} to ${data.status}`,
    };
  }
  await Order.findByIdAndUpdate(
    { _id: shipping.orderId },
    {
      shippingStatus: response?.data?.status,
      orderStatus:
        response?.data?.status === "completed" ? response?.data?.status : "",
    },
    { new: true }
  );
  return response;
}

// Delete a Shipping entry by ID
export async function deleteShipping(id: string) {
  await connection();
  return await Shipping.findByIdAndDelete(id).exec();
}
