"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Types } from "mongoose";
import { auth } from "@/app/auth";

// Import your models and connection utility
import { connection } from "@/utils/connection"; // Adjust path to your DB connection
import Address, { IAddress } from "@/models/Address";
import { PaymentMethod } from "@/models/PaymentMethod";

// ------------------ Authentication Helper ------------------
// Replace this with your actual auth logic (NextAuth, Clerk, etc.)
async function getAuthenticatedUser() {
  // Example placeholder:
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ------------------ Validation Schemas (Zod) ------------------

// Address Schema
const addressSchema = z.object({
  label: z.string().min(1, "Label is required"),
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().default("Cameroon"),
  isDefault: z.boolean().default(false),
});

// ------------------ 1. ADDRESS ACTIONS ------------------

/**
 * Create a new billing address for the authenticated user.
 */
export async function createAddress(formData: FormData) {
  const userId = await getAuthenticatedUser();
  await connection();

  // Parse form data into an object
  const rawData = {
    label: formData.get("label"),
    street: formData.get("street"),
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode"),
    country: formData.get("country") || "Cameroon",
    isDefault:
      formData.get("isDefault") === "on" ||
      formData.get("isDefault") === "true",
  };

  const validated = addressSchema.parse(rawData);

  const address = new Address({
    ...validated,
    userId: new Types.ObjectId(userId),
  });

  await address.save();

  revalidatePath("/profile/addresses");
  revalidatePath("/profile/payment-methods");

  return { success: true, address: JSON.parse(JSON.stringify(address)) };
}

/**
 * Get all addresses for the authenticated user.
 */
export async function getUserAddresses() {
  const userId = await getAuthenticatedUser();
  await connection();

  const addresses = await Address.find({ userId: new Types.ObjectId(userId) })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

  return JSON.parse(JSON.stringify(addresses)) as IAddress[];
}

/**
 * Update an existing address. If setting it to default, the pre-save hook
 * automatically unsets other defaults for this user.
 */
export async function updateAddress(addressId: string, formData: FormData) {
  const userId = await getAuthenticatedUser();
  await connection();

  const rawData = {
    label: formData.get("label"),
    street: formData.get("street"),
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode"),
    country: formData.get("country") || "Cameroon",
    isDefault:
      formData.get("isDefault") === "on" ||
      formData.get("isDefault") === "true",
  };

  const validated = addressSchema.parse(rawData);

  const address = await Address.findOneAndUpdate(
    { _id: addressId, userId: new Types.ObjectId(userId) }, // Ensure ownership
    { ...validated },
    { new: true, runValidators: true },
  );

  if (!address) {
    throw new Error("Address not found or unauthorized");
  }

  revalidatePath("/profile/addresses");
  revalidatePath("/profile/payment-methods");

  return { success: true, address: JSON.parse(JSON.stringify(address)) };
}

/**
 * Delete an address.
 * Prevents deletion if the address is linked to an existing credit card.
 */
export async function deleteAddress(addressId: string) {
  const userId = await getAuthenticatedUser();
  await connection();

  // 1. Check if this address is used by any Credit Card payment method
  const linkedCard = await PaymentMethod.findOne({
    userId: new Types.ObjectId(userId),
    methodType: "CreditCard",
    "details.billingAddressId": new Types.ObjectId(addressId),
  });

  if (linkedCard) {
    throw new Error(
      "Cannot delete this address because it is linked to an existing credit card. Please remove the card first.",
    );
  }

  // 2. Delete the address
  const result = await Address.findOneAndDelete({
    _id: addressId,
    userId: new Types.ObjectId(userId),
  });

  if (!result) {
    throw new Error("Address not found or unauthorized");
  }

  revalidatePath("/profile/addresses");
  revalidatePath("/profile/payment-methods");

  return { success: true, message: "Address deleted successfully" };
}

/**
 * Set a specific address as the default (convenience wrapper).
 */
export async function setDefaultAddress(addressId: string) {
  const userId = await getAuthenticatedUser();
  await connection();

  // Find the address to ensure ownership
  const address = await Address.findOne({
    _id: addressId,
    userId: new Types.ObjectId(userId),
  });

  if (!address) {
    throw new Error("Address not found or unauthorized");
  }

  // The pre-save hook will handle unsetting other defaults automatically
  address.isDefault = true;
  await address.save();

  revalidatePath("/profile/addresses");

  return { success: true, address: JSON.parse(JSON.stringify(address)) };
}
