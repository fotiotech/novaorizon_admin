"use server";

import { requireAdmin } from "@/lib/authz";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";
import { revalidatePath } from "next/cache";

/**
 * Attribute sets live in the Express backend (`/api/attribute-sets`). The
 * backend already returns client-safe JSON (no Mongoose/BSON values), so this
 * module only forwards calls and keeps the `{ success, data?, error? }`
 * result shape the UI expects.
 */

// Update this to the route that actually hosts the Attribute Sets list page.
const LIST_PATH = "/catalog/attributes/sets";

/** Mirrors the ObjectId validation the old Mongoose call performed. */
function isValidId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// ========================================================================
//  createAttributeSet
// ========================================================================
export async function createAttributeSet(data: {
  title: string;
  code: string;
  description?: string;
  sortOrder?: number;
}) {
  await requireAdmin();

  const title = data.title?.trim() ?? "";
  const code = data.code?.trim() ?? "";

  if (!title) return { success: false, error: "Title is required" };
  if (!code) return { success: false, error: "Code is required" };

  try {
    const attributeSet = await apiData<any>("/attribute-sets", {
      method: "POST",
      body: {
        title,
        code,
        description: data.description?.trim(),
        sortOrder: data.sortOrder ?? 0,
      },
    });

    revalidatePath(LIST_PATH);
    return { success: true, data: attributeSet };
  } catch (error: any) {
    console.error("[createAttributeSet]", error);
    return {
      success: false,
      error: error?.message || "Failed to create attribute set",
    };
  }
}

// ========================================================================
//  getAttributeSets
// ========================================================================
export async function getAttributeSets() {
  await requireAdmin();
  try {
    const attributeSets = await apiData<any[]>("/attribute-sets");
    return { success: true, data: attributeSets ?? [] };
  } catch (error: any) {
    console.error("[getAttributeSets]", error);
    return { success: false, error: "Failed to fetch attribute sets" };
  }
}

// ========================================================================
//  getAttributeSet
// ========================================================================
export async function getAttributeSet(id: string) {
  await requireAdmin();

  if (!isValidId(id)) {
    return { success: false, error: "Invalid attribute set ID" };
  }

  try {
    const set = await apiData<any>(
      `/attribute-sets/${encodeURIComponent(id)}`,
    );
    if (!set) return { success: false, error: "Attribute set not found" };
    return { success: true, data: set };
  } catch (error: any) {
    console.error("[getAttributeSet]", error);
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Attribute set not found" };
    }
    return { success: false, error: "Failed to fetch attribute set" };
  }
}

// ========================================================================
//  updateAttributeSet
// ========================================================================
export async function updateAttributeSet(
  id: string,
  data: {
    title: string;
    code: string;
    description?: string;
    sortOrder?: number;
  },
) {
  await requireAdmin();

  const title = data.title?.trim() ?? "";
  const code = data.code?.trim() ?? "";

  if (!title) return { success: false, error: "Title is required" };
  if (!code) return { success: false, error: "Code is required" };

  if (!isValidId(id)) {
    return { success: false, error: "Invalid attribute set ID" };
  }

  try {
    const updated = await apiData<any>(
      `/attribute-sets/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: {
          title,
          code,
          description: data.description,
          sortOrder: data.sortOrder,
        },
      },
    );

    if (!updated) {
      return { success: false, error: "Attribute set not found" };
    }

    revalidatePath(LIST_PATH);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("[updateAttributeSet]", error);
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Attribute set not found" };
    }
    return {
      success: false,
      error: error?.message || "Failed to update attribute set",
    };
  }
}

// ========================================================================
//  deleteAttributeSet
//
//  The backend detaches this set from every CategoryProperty mapping in one
//  round-trip, then deletes the set itself.
// ========================================================================
export async function deleteAttributeSet(id: string) {
  await requireAdmin();

  if (!isValidId(id)) {
    return { success: false, error: "Invalid attribute set ID" };
  }

  try {
    await apiFetch(`/attribute-sets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    revalidatePath(LIST_PATH);
    return { success: true };
  } catch (error: any) {
    console.error("[deleteAttributeSet]", error);
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Attribute set not found" };
    }
    return {
      success: false,
      error: error?.message || "Failed to delete attribute set",
    };
  }
}
