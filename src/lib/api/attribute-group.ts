// lib/api/attribute-group.ts — only findGroup + tree differ from previous version
import api from "@/lib/api";

export interface ApiAttributeGroup {
  _id: string;
  code: string;
  name: string;
  parentId?: string | null;
  parent_id?: string | null;
  sortOrder?: number;
  sort_order?: number;
  createdAt?: string;
  children?: ApiAttributeGroup[];
  [k: string]: any;
}

export interface AttributeGroupUsageEntry {
  categories: Array<{ _id: string; name: string }>;
}

/** GET /api/attribute-groups — returns the tree, built server-side. */
export async function findAllAttributeGroups(): Promise<ApiAttributeGroup[]> {
  const res = await api.get<{ data: ApiAttributeGroup[] }>("/attribute-groups");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/**
 * GET /api/attribute-groups/tree?id=:id — single node (used by the edit modal).
 * The backend returns `{ data: groupNode }` when `?id=` is supplied.
 */
export async function findGroup(id: string): Promise<ApiAttributeGroup> {
  const res = await api.get<{ data: ApiAttributeGroup }>(
    "/attribute-groups/tree",
    { params: { id } },
  );
  return res.data.data;
}

/** GET /api/attribute-groups/tree — full tree (no id). */
export async function findGroupTree(): Promise<ApiAttributeGroup[]> {
  const res = await api.get<{ data: ApiAttributeGroup[] }>(
    "/attribute-groups/tree",
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** GET /api/attribute-groups/usage */
export async function getAttributeGroupsUsageMap(): Promise<
  Record<string, AttributeGroupUsageEntry>
> {
  const res = await api.get<{
    data: Record<string, AttributeGroupUsageEntry>;
  }>("/attribute-groups/usage");
  return res.data?.data ?? {};
}

/** POST /api/attribute-groups */
export async function createAttributeGroup(payload: {
  name: string;
  code: string;
  parentId?: string | null;
  sortOrder?: number;
}): Promise<ApiAttributeGroup> {
  const res = await api.post<{ data: ApiAttributeGroup }>(
    "/attribute-groups",
    payload,
  );
  return res.data.data;
}

/** PATCH /api/attribute-groups/:id */
export async function updateAttributeGroup(
  id: string,
  payload: Partial<{
    name: string;
    code: string;
    parentId: string | null;
    sortOrder: number;
  }>,
): Promise<ApiAttributeGroup> {
  const res = await api.patch<{ data: ApiAttributeGroup }>(
    `/attribute-groups/${id}`,
    payload,
  );
  return res.data.data;
}

/** DELETE /api/attribute-groups/:id */
export async function deleteAttributeGroup(id: string): Promise<void> {
  await api.delete(`/attribute-groups/${id}`);
}
