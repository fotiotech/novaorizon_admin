"use server";

import { connection } from "@/utils/connection";
import Shipping from "@/models/Shipping";
import Order from "@/models/Order";
import "@/models/User";

// Define status transition rules
const statusTransitions: Record<string, string[]> = {
  pending: ["cancelled", "assigned"],
  assigned: ["in-transit"],
  "in-transit": ["delivered"],
  delivered: ["completed", "returned"],
  returned: [],
  completed: [],
  cancelled: [],
};

// Create a new Shipping entry
export async function createShipping(data: any) {
  await connection();
  return await Shipping.create(data);
}

// Get a single Shipping entry by ID
export async function getShippingById(id: string) {
  await connection();
  return await Shipping.findById(id).exec();
}

// Get all Shipping entries
export async function getAllShippings() {
  await connection();
  return await Shipping.find({}).exec();
}

// Update a Shipping entry by ID
export async function updateShipping(id: string, data: any) {
  await connection();

  const shipping = await Shipping.findById(id).exec();
  if (!shipping) {
    return {
      success: false,
      error: `Shipping entry with ID ${id} not found`,
    };
  }

  // If status is being changed, validate the transition
  if (data.status && data.status !== shipping.status) {
    // Check if status transition is valid
    if (!statusTransitions[shipping.status]?.includes(data.status)) {
      return {
        success: false,
        error: `Invalid status transition from ${shipping.status} to ${data.status}`,
      };
    }
  }

  // Prepare update data
  const updateData: any = { ...data };

  // Only add returnReason if status is being changed to returned
  if (data.status === "returned") {
    updateData.returnReason = data.returnReason;
  } else if (shipping.status !== "returned" && data.status !== "returned") {
    // Clear returnReason if not in returned status
    updateData.returnReason = undefined;
  }

  try {
    // Update shipping
    const updatedShipping = await Shipping.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).exec();

    // Update order if status changed
    if (data.status && data.status !== shipping.status) {
      await Order.findByIdAndUpdate(
        shipping.orderId,
        {
          shippingStatus: data.status,
          ...(data.status === "completed" && { orderStatus: "completed" }),
        },
        { new: true }
      ).exec();
    }

    return { success: true, data: updatedShipping };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Delete a Shipping entry by ID
export async function deleteShipping(id: string) {
  await connection();
  return await Shipping.findByIdAndDelete(id).exec();
}
