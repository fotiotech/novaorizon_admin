"use server";

import { requireUser, requireAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";

// ------------------ Authentication Helper ------------------
async function getAuthenticatedUser() {
  const user = await requireUser();
  return user.id;
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
  await requireAdmin();
  await getAuthenticatedUser();

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

  // The backend scopes the address to the authenticated user.
  const address = await apiData<any>("/addresses", {
    method: "POST",
    body: validated,
  });

  revalidatePath("/profile/addresses");
  revalidatePath("/profile/payment-methods");

  return { success: true, address };
}

/**
 * Get all addresses for the authenticated user.
 */
export async function getUserAddresses() {
  await requireAdmin();
  await getAuthenticatedUser();

  const addresses = await apiData<any[]>("/addresses");

  return JSON.parse(JSON.stringify(addresses ?? [])) as any[];
}

/**
 * Update an existing address. If setting it to default, the backend's
 * pre-save hook automatically unsets other defaults for this user.
 */
export async function updateAddress(addressId: string, formData: FormData) {
  await requireAdmin();
  await getAuthenticatedUser();

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

  try {
    const address = await apiData<any>(
      `/addresses/${encodeURIComponent(addressId)}`,
      { method: "PATCH", body: validated },
    );

    revalidatePath("/profile/addresses");
    revalidatePath("/profile/payment-methods");

    return { success: true, address };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Error("Address not found or unauthorized");
    }
    throw error;
  }
}

/**
 * Delete an address.
 * Prevents deletion if the address is linked to an existing credit card.
 */
export async function deleteAddress(addressId: string) {
  await requireAdmin();
  await getAuthenticatedUser();

  try {
    await apiFetch(`/addresses/${encodeURIComponent(addressId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 409) {
        throw new Error(
          "Cannot delete this address because it is linked to an existing credit card. Please remove the card first.",
        );
      }
      if (error.status === 404) {
        throw new Error("Address not found or unauthorized");
      }
    }
    throw error;
  }

  revalidatePath("/profile/addresses");
  revalidatePath("/profile/payment-methods");

  return { success: true, message: "Address deleted successfully" };
}

/**
 * Set a specific address as the default (convenience wrapper).
 */
export async function setDefaultAddress(addressId: string) {
  await requireAdmin();
  await getAuthenticatedUser();

  try {
    const address = await apiData<any>(
      `/addresses/${encodeURIComponent(addressId)}/default`,
      { method: "PATCH" },
    );

    revalidatePath("/profile/addresses");

    return { success: true, address };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Error("Address not found or unauthorized");
    }
    throw error;
  }
}
