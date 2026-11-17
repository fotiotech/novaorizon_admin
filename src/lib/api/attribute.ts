// lib/api/attribute.ts
import api from "@/lib/api";

export interface ApiAttribute {
  _id: string;
  code: string;
  name: string;
  unitFamily?: { _id: string; name: string; baseUnit: string } | null;
  isRequired?: boolean;
  option?: string[];
  type: string;
  sortOrder?: number;
  sort_order?: number;
  [k: string]: any;
}

export interface AttributeUsageEntry {
  categories: Array<{ _id: string; name: string }>;
  groups: Array<{ _id: string; name: string; code?: string }>;
}

/**
 * GET /api/attributes
 * Pass `id` to fetch a single attribute (`?id=`); omit for the full list.
 */
export async function findAttributesAndValues(
  id?: string,
): Promise<ApiAttribute[]> {
  const res = await api.get<{ data: ApiAttribute[] | ApiAttribute }>(
    "/attributes",
    { params: id ? { id } : undefined },
  );
  const data = res.data?.data;
  return Array.isArray(data) ? data : data ? [data] : [];
}

/** POST /api/attributes — bulk create (arrays per field) */
export async function createAttribute(payload: {
  codes: string[];
  unitFamilies: string[];
  names: string[];
  isRequired: boolean[];
  sort_orders: number[];
  option?: string[][];
  type: string[];
}): Promise<ApiAttribute[]> {
  const res = await api.post<{ success: boolean; data: ApiAttribute[] }>(
    "/attributes",
    payload,
  );
  return res.data.data;
}

/** PATCH /api/attributes/:id — single update */
export async function updateAttribute(
  id: string,
  payload: {
    code: string;
    unitFamily: string;
    name: string;
    isRequired: boolean;
    sort_order: number;
    option?: string[];
    type: string;
  },
): Promise<ApiAttribute> {
  const res = await api.patch<{ success: boolean; data: ApiAttribute }>(
    `/attributes/${id}`,
    payload,
  );
  return res.data.data;
}

/** DELETE /api/attributes/:id */
export async function deleteAttribute(id: string): Promise<void> {
  await api.delete(`/attributes/${id}`);
}

/** GET /api/attributes/usage */
export async function getAttributesUsageMap(): Promise<
  Record<string, AttributeUsageEntry>
> {
  const res = await api.get<{ data: Record<string, AttributeUsageEntry> }>(
    "/attributes/usage",
  );
  return res.data?.data ?? {};
}
