"use server";

import { requireAdmin } from "@/lib/authz";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";
import { revalidatePath } from "next/cache";

/**
 * Attributes live in the Express backend (`/api/attributes`). The backend
 * resolves `unitFamily`, cleans up references on delete and builds the usage
 * map, so this module only forwards calls and preserves the old result shapes.
 */

// Add TypeScript interfaces
interface AttributeFormData {
  codes: string[];
  unitFamilies: string[];
  names: string[];
  isRequired: boolean[];
  sort_orders: number[];
  option?: string[][];
  type: string[];
}

interface AttributeUpdateParams {
  code: string;
  unitFamily: string;
  name: string;
  isRequired: boolean;
  sort_order: number;
  option?: string[];
  type: string;
}

/** Mirrors the ObjectId validation the old Mongoose calls performed. */
function isValidId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function findAttributesAndValues(id?: string) {
  await requireAdmin();
  try {
    if (id) {
      try {
        const attribute = await apiData<any>("/attributes", {
          query: { id },
        });
        return attribute ?? null;
      } catch (error) {
        // The backend answers 404 for a missing attribute; old code returned null.
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    }

    const attributes = await apiData<any[]>("/attributes");
    return attributes ?? [];
  } catch (error) {
    console.error("Error in findAttributesAndValues:", error);
    throw new Error("Failed to fetch attributes");
  }
}

// createAttribute – handle empty unitFamily safely
export async function createAttribute(formData: AttributeFormData) {
  await requireAdmin();
  const { codes, unitFamilies, names, isRequired, sort_orders, option, type } =
    formData;
  if (!Array.isArray(names) || names.length === 0) {
    throw new Error("Missing required fields");
  }
  try {
    const attributes = await apiData<any[]>("/attributes", {
      method: "POST",
      body: {
        codes,
        unitFamilies,
        names,
        isRequired,
        sort_orders,
        option,
        type,
      },
    });

    revalidatePath("/admin/attributes");
    return { success: true, attributes };
  } catch (error) {
    console.error("Error in createAttribute:", error);
    throw new Error("Failed to create attributes: " + (error as Error).message);
  }
}

export async function updateAttribute(
  _id: string,
  params: AttributeUpdateParams,
) {
  await requireAdmin();

  try {
    // The backend normalises `option` and `unitFamily` exactly as before.
    const updated = await apiData<any>(
      `/attributes/${encodeURIComponent(_id)}`,
      { method: "PATCH", body: params },
    );

    if (!updated) {
      throw new Error("Attribute not found");
    }

    revalidatePath("/admin/attributes");
    return { success: true, attribute: updated };
  } catch (err) {
    console.error("Error in updateAttribute:", err);
    throw err;
  }
}

// app/actions/attributes.ts

export async function deleteAttribute(id: string) {
  await requireAdmin();

  if (!isValidId(id)) {
    throw new Error("Invalid attribute ID");
  }

  try {
    await apiFetch(`/attributes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    revalidatePath("/admin/attributes");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteAttribute:", error);
    throw new Error("Failed to delete attribute: " + (error as Error).message);
  }
}

// ========================================================================
//  getAttributesUsageMap
//
//  The backend walks CategoryProperty.mappings[].groups[].attributes[].attribute
//  and resolves:
//    - the groups those attributes belong to (by group id)
//    - the categories that use each property (own OR inherited snapshot)
//
//  Returns: { [attributeId]: { categories: [{_id,name}], groups: [{_id,name,code}] } }
// ========================================================================
export async function getAttributesUsageMap(): Promise<
  Record<
    string,
    {
      categories: Array<{ _id: string; name: string }>;
      groups: Array<{ _id: string; name: string; code?: string }>;
    }
  >
> {
  await requireAdmin();

  const result = await apiData<
    Record<
      string,
      {
        categories: Array<{ _id: string; name: string }>;
        groups: Array<{ _id: string; name: string; code?: string }>;
      }
    >
  >("/attributes/usage");

  return result ?? {};
}
