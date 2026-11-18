// lib/api/shipping.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";

/* ------------------------------ helpers ---------------------------- */

function toMessage(err: any): string {
  const payload = err?.response?.data;
  if (payload?.errors) {
    const flat = Object.entries(payload.errors as Record<string, unknown>)
      .flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [],
      )
      .join("; ");
    if (flat) return flat;
  }
  return payload?.message || err?.message || "Unknown error occurred";
}

export interface ShippingApiResult {
  success: boolean;
  data?: any;
  error?: string;
}

/* ------------------------------- CRUD ------------------------------ */

/** POST /api/shipping — admin only. */
export async function createShipping(data: any): Promise<any> {
  const res = await api.post<{ success?: boolean; data: any }>(
    "/shipping",
    data,
  );
  return res.data?.data;
}

/** GET /api/shipping/:id — admin only. Returns null when the entry is gone. */
export async function getShippingById(id: string): Promise<any | null> {
  try {
    const res = await api.get<{ data: any }>(
      `/shipping/${encodeURIComponent(id)}`,
    );
    return res.data?.data ?? null;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/** GET /api/shipping — admin only. */
export async function getAllShippings(): Promise<any[]> {
  const res = await api.get<{ data: any[] }>("/shipping");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/**
 * PATCH /api/shipping/:id — admin only.
 *
 * Status-transition rules and order side-effects live in the backend
 * controller; this keeps the old `{ success, data | error }` result shape.
 */
export async function updateShipping(
  id: string,
  data: any,
): Promise<ShippingApiResult> {
  try {
    const res = await api.patch<{ success?: boolean; data: any }>(
      `/shipping/${encodeURIComponent(id)}`,
      data,
    );
    return { success: true, data: res.data?.data };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return {
        success: false,
        error: `Shipping entry with ID ${id} not found`,
      };
    }
    return { success: false, error: toMessage(error) };
  }
}

/** DELETE /api/shipping/:id — admin only. Null when nothing matched. */
export async function deleteShipping(id: string): Promise<any | null> {
  try {
    const res = await api.delete(`/shipping/${encodeURIComponent(id)}`);
    return res.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}
