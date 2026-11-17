"use server";

import { requireAdmin } from "@/lib/authz";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";

/**
 * Shipping records live in the Express backend (`/api/shipping`). Status
 * transition rules and the order side-effects are enforced server-side.
 */

// Create a new Shipping entry
export async function createShipping(data: any) {
  await requireAdmin();
  return await apiData<any>("/shipping", { method: "POST", body: data });
}

// Get a single Shipping entry by ID
export async function getShippingById(id: string) {
  await requireAdmin();

  try {
    return await apiData<any>(`/shipping/${encodeURIComponent(id)}`);
  } catch (error) {
    // The backend answers 404 for a missing entry; the old code returned null.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// Get all Shipping entries
export async function getAllShippings() {
  await requireAdmin();
  return (await apiData<any[]>("/shipping")) ?? [];
}

// Update a Shipping entry by ID
export async function updateShipping(id: string, data: any) {
  await requireAdmin();

  try {
    const updatedShipping = await apiData<any>(
      `/shipping/${encodeURIComponent(id)}`,
      { method: "PATCH", body: data },
    );

    return { success: true, data: updatedShipping };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        success: false,
        error: `Shipping entry with ID ${id} not found`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Delete a Shipping entry by ID
export async function deleteShipping(id: string) {
  await requireAdmin();

  try {
    return await apiFetch(`/shipping/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (error) {
    // The old `findByIdAndDelete` returned null when nothing matched.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
