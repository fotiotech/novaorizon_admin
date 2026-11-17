// lib/api/unit.ts
import api from "@/lib/api";

export interface ApiUnit {
  _id: string;
  name: string;
  symbol: string;
  unitFamily:
    | string
    | { _id: string; name: string; baseUnit: string; [k: string]: any };
  conversionFactor: number;
  isBaseUnit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitPayload {
  name: string;
  symbol: string;
  unitFamily?: string;
  conversionFactor: number;
  isBaseUnit: boolean;
}

/** GET /api/units — admin only. Optionally filter by family. */
export async function getUnits(unitFamilyId?: string): Promise<ApiUnit[]> {
  const res = await api.get<{ data: ApiUnit[] }>("/units", {
    params: unitFamilyId ? { unitFamilyId } : undefined,
  });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** POST /api/units — admin only. */
export async function createUnit(
  payload: UnitPayload,
): Promise<{ success: boolean; message?: string }> {
  const res = await api.post<{ success: boolean; message?: string }>(
    "/units",
    payload,
  );
  return res.data;
}

/**
 * PATCH /api/units/:id — admin only.
 *
 * ⚠️ The backend's `updateUnit` handler only reads
 *    { name, symbol, conversionFactor, isBaseUnit }.
 * `unitFamily` is accepted here for forward-compat but currently dropped
 * server-side. See the note at the bottom of this reply.
 */
export async function updateUnit(
  id: string,
  payload: UnitPayload,
): Promise<{ success: boolean; message?: string }> {
  const res = await api.patch<{ success: boolean; message?: string }>(
    `/units/${id}`,
    payload,
  );
  return res.data;
}

/** DELETE /api/units/:id — admin only. */
export async function deleteUnit(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/units/${id}`,
  );
  return res.data;
}
