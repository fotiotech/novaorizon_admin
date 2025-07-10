'use server';

// CRUD Operations for Shipping

import Shipping from "@/models/Shipping";
import { connection } from "@/utils/connection";

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
  return await Shipping.findByIdAndUpdate(id, data, { new: true }).exec();
}

// Delete a Shipping entry by ID
export async function deleteShipping(id: string) {
    await connection();
  return await Shipping.findByIdAndDelete(id).exec();
}
