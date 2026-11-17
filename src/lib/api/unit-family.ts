// lib/api/unit-family.ts
import api from "@/lib/api";

export interface ApiUnitFamily {
  _id: string;
  name: string;
  description?: string | null;
  baseUnit: string;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /api/unit-families — admin only */
export async function listUnitFamilies(): Promise<ApiUnitFamily[]> {
  const res = await api.get<{ data: ApiUnitFamily[] }>("/unit-families");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** POST /api/unit-families — admin only */
export async function createUnitFamily(payload: {
  name: string;
  description?: string;
  baseUnit: string;
}): Promise<{ success: boolean; message?: string }> {
  const res = await api.post<{ success: boolean; message?: string }>(
    "/unit-families",
    payload,
  );
  return res.data;
}

/** PATCH /api/unit-families/:id — admin only */
export async function updateUnitFamily(
  id: string,
  payload: {
    name: string;
    description?: string;
    baseUnit: string;
  },
): Promise<{ success: boolean; message?: string }> {
  const res = await api.patch<{ success: boolean; message?: string }>(
    `/unit-families/${id}`,
    payload,
  );
  return res.data;
}

/** DELETE /api/unit-families/:id — admin only */
export async function deleteUnitFamily(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/unit-families/${id}`,
  );
  return res.data;
}

export { listUnitFamilies as getUnitFamilies };
