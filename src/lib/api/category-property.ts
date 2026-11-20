// lib/api/category-property.ts
import api from "@/lib/api";

/* ------------------------------ types ------------------------------ */

export interface ApiCategoryPropertyAttribute {
  attribute: string;
  isRequired?: boolean;
  isHighlight?: boolean;
  isVariant?: boolean;
  isVariantAttribute?: boolean;
}

export interface ApiCategoryPropertyGroup {
  group: string;
  attributes: ApiCategoryPropertyAttribute[];
}

export interface ApiCategoryPropertyMapping {
  set: string;
  groups: ApiCategoryPropertyGroup[];
}

export interface ApiCategoryProperty {
  _id: string;
  code: string;
  name: string;
  description?: string | null;
  readOnly?: boolean;
  mappings?: ApiCategoryPropertyMapping[];
  sets?: string[];
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

export interface CategoryPropertyPayload {
  code: string;
  name: string;
  description?: string;
  mappings: ApiCategoryPropertyMapping[];
}

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function toError(err: any): string {
  const payload = err?.response?.data;
  if (payload?.errors) {
    const flat = Object.entries(payload.errors as Record<string, unknown>)
      .flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [],
      )
      .join("; ");
    if (flat) return flat;
  }
  return payload?.message || err?.message || "Request failed";
}

/* ---------------------------- fetchers ---------------------------- */

/** GET /api/category-properties?includeReadOnly=... — admin only */
export async function fetchCategoryProperties(opts?: {
  includeReadOnly?: boolean;
}): Promise<ApiCategoryProperty[]> {
  const res = await api.get<{ data: ApiCategoryProperty[] }>(
    "/category-properties",
    {
      params: opts?.includeReadOnly ? { includeReadOnly: "true" } : undefined,
    },
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** GET /api/category-properties?id=:id — admin only */
export async function fetchCategoryProperty(
  id: string,
): Promise<ApiCategoryProperty> {
  const res = await api.get<{ data: ApiCategoryProperty }>(
    "/category-properties",
    { params: { id } },
  );
  return res.data.data;
}

/* ---------------------------- mutations --------------------------- */

/** POST /api/category-properties — admin only */
export async function createCategoryProperty(
  payload: CategoryPropertyPayload,
): Promise<ActionResult<ApiCategoryProperty>> {
  try {
    const res = await api.post<{
      success: boolean;
      data: ApiCategoryProperty;
    }>("/category-properties", payload);
    return { success: true, data: res.data.data };
  } catch (err) {
    return { success: false, error: toError(err) };
  }
}

/** PATCH /api/category-properties/:id — admin only */
export async function updateCategoryProperty(
  id: string,
  payload: CategoryPropertyPayload,
): Promise<ActionResult<ApiCategoryProperty>> {
  try {
    const res = await api.patch<{
      success: boolean;
      data: ApiCategoryProperty;
    }>(`/category-properties/${id}`, payload);
    return { success: true, data: res.data.data };
  } catch (err) {
    return { success: false, error: toError(err) };
  }
}

/** DELETE /api/category-properties/:id — admin only */
export async function deleteCategoryProperty(
  id: string,
): Promise<ActionResult> {
  try {
    const res = await api.delete<{ success: boolean; message?: string }>(
      `/category-properties/${id}`,
    );
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: toError(err) };
  }
}