// attributegroup.ts
"use server";
import { requireAdmin } from "@/lib/authz";

import { ApiError, apiData, apiFetch } from "@/lib/server-api";
import { revalidatePath } from "next/cache";

/**
 * Attribute groups live in the Express backend (`/api/attribute-groups`).
 * The backend builds the tree and the usage map, so this module only forwards
 * the calls and re-applies the serialization the UI relies on.
 */

export interface Group {
  _id: string;
  code: string;
  name: string;
  parentId: string;
  createdAt?: Date;
  sortOrder: number;
  children?: Group[];
}

function serializeGroup(group: any): Group {
  return {
    _id: String(group._id),
    code: group.code,
    name: group.name,
    parentId: group.parentId ? String(group.parentId) : "",
    createdAt: group.createdAt ? new Date(group.createdAt) : undefined,
    sortOrder: group.sortOrder,
  };
}

/** Applies `serializeGroup` to a tree returned by the API. */
function serializeTree(nodes: any[] | null | undefined): Group[] {
  return (nodes ?? []).map((node) => ({
    ...serializeGroup(node),
    children: serializeTree(node.children),
  }));
}

// --- findAllAttributeGroups ---
export async function findAllAttributeGroups(
  id?: string,
): Promise<Group[] | null> {
  await requireAdmin();
  try {
    const groups = await apiData<any[]>("/attribute-groups", {
      query: id ? { id } : undefined,
    });

    return serializeTree(groups);
  } catch (error) {
    console.error("[AttributeGroup] Error in findAllAttributeGroups:", error);
    return null;
  }
}

// --- createAttributeGroup ---
export async function createAttributeGroup(
  action: string | null,
  groupId: string,
  name: string,
  code: string,
  parentId: string,
  sortOrder: number,
) {
  await requireAdmin();
  try {
    if (!action) return;
    if (action === "create" || action === "edit") {
      const newGroup = await apiData<any>("/attribute-groups", {
        method: "POST",
        body: {
          name,
          code,
          parentId: parentId ? parentId : undefined,
          sortOrder: sortOrder ?? null,
        },
      });
      revalidatePath("/catalog/attributes/groups");
      return serializeGroup(newGroup);
    }
  } catch (error) {
    console.error("[AttributeGroup] Error creating group:", error);
    throw error;
  }
}

// --- findGroup ---
export async function findGroup(id?: string) {
  await requireAdmin();
  try {
    // `/tree` returns the whole tree, or a single node when `?id=` is given.
    const data = await apiData<any>("/attribute-groups/tree", {
      query: id ? { id } : undefined,
    });

    // The backend returns `[]` when there are no groups at all.
    if (Array.isArray(data)) return data;
    // A single group node was requested and found.
    if (data) return data;

    return { success: false, error: "Group not found" };
  } catch (error) {
    console.error("Error finding groups:", error);
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, error: "Group not found" };
    }
    return { success: false, error: "Failed to fetch groups" };
  }
}

// --- updateAttributeGroup ---
export async function updateAttributeGroup(
  id: string,
  updates: Partial<{
    name: string;
    code: string;
    parentId: string | null;
    sortOrder: number;
  }>,
) {
  await requireAdmin();
  try {
    const updated = await apiData<any>(
      `/attribute-groups/${encodeURIComponent(id)}`,
      { method: "PATCH", body: updates },
    );

    revalidatePath("/catalog/attributes/groups");
    return serializeGroup(updated);
  } catch (error) {
    console.error("[AttributeGroup] Error updating group:", error);
    throw error;
  }
}

// --- deleteAttributeGroup ---
export async function deleteAttributeGroup(id: string) {
  await requireAdmin();
  try {
    await apiFetch(`/attribute-groups/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    revalidatePath("/catalog/attributes/groups");
    return { success: true };
  } catch (error) {
    console.error("[AttributeGroup] Error deleting group:", error);
    throw error;
  }
}

// ========================================================================
//  getAttributeGroupsUsageMap
//
//  For each AttributeGroup, returns the categories that use it, i.e.
//  every category whose (own OR inherited) CategoryProperty has a
//  mapping that references the group.
//
//  Returns: { [groupId]: { categories: [{_id, name}] } }
// ========================================================================
export async function getAttributeGroupsUsageMap(): Promise<
  Record<string, { categories: Array<{ _id: string; name: string }> }>
> {
  await requireAdmin();

  const result = await apiData<
    Record<string, { categories: Array<{ _id: string; name: string }> }>
  >("/attribute-groups/usage");

  return result ?? {};
}
