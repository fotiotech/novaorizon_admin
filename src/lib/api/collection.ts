// lib/api/collection.ts
import api from "@/lib/api";

/* ------------------------------ types ------------------------------ */

export type CollectionType = "rule" | "manual" | "recommendation";

export interface ApiCollection {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  type: CollectionType;
  targetType: string;
  rules?: any[];
  items?: any[] | string[];
  display?: Record<string, any>;
  ctaText?: string | null;
  ctaLink?: string | null;
  ctaStyle?: string;
  status?: string;
  order?: number;
  sort?: { field: string; direction: "asc" | "desc" } | null;
  showName?: boolean;
  recommendationType?: string | null;
  recommendationLimit?: number | null;
  created_at?: string;
  updated_at?: string;
  [k: string]: any;
}

export interface ResolvedCollectionRow {
  collection: ApiCollection;
  items: any[];
  itemCount: number;
  isDynamic: boolean;
}

export interface AvailableItem {
  _id: string;
  name: string;
  imageUrl: string | null;
}

export interface CollectionActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/* --------------------------- error helper -------------------------- */

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
  return payload?.message || err?.message || "Request failed";
}

/* -------------------- FormData → JSON adapter ---------------------- */

/**
 * The old server action accepted a FormData built by CollectionForm with
 * dotted keys and JSON-encoded arrays:
 *
 *   display.layout / display.columns / display.gap / display.showImages /
 *   display.cardShape
 *   sort.field / sort.direction
 *   rules  → JSON string of Rule[]
 *   items  → JSON string of string[]
 *   showName → "true" | "false"
 *   order, recommendationLimit → strings
 *
 * The Express controller reads a plain JSON body with nested `display` /
 * `sort` objects and native arrays / booleans. This adapter bridges the
 * two so the form's submit handler stays byte-identical.
 */
function formDataToBackendBody(fd: FormData): Record<string, any> {
  const raw: Record<string, string> = {};
  fd.forEach((value, key) => {
    if (typeof value === "string") raw[key] = value;
  });

  const body: Record<string, any> = {
    name: raw.name,
    description: raw.description,
    imageUrl: raw.imageUrl,
    status: raw.status,
    type: raw.type,
    targetType: raw.targetType,
    order: raw.order ? Number(raw.order) : 0,
    showName: raw.showName === "true",
    recommendationType: raw.recommendationType,
    recommendationLimit: raw.recommendationLimit
      ? Number(raw.recommendationLimit)
      : undefined,
    ctaText: raw.ctaText,
    ctaLink: raw.ctaLink,
    ctaStyle: raw.ctaStyle,
  };

  // Dotted `display.*` → nested display object
  const display: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith("display.")) continue;
    const sub = key.slice("display.".length);
    if (sub === "columns" || sub === "gap") display[sub] = Number(value) || 0;
    else if (sub === "showImages") display[sub] = value === "true";
    else display[sub] = value;
  }
  if (Object.keys(display).length > 0) body.display = display;

  // Dotted `sort.*` → nested sort object
  const sort: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith("sort.")) continue;
    sort[key.slice("sort.".length)] = value;
  }
  if (Object.keys(sort).length > 0) body.sort = sort;

  // JSON-encoded arrays
  try {
    body.rules = raw.rules ? JSON.parse(raw.rules) : [];
  } catch {
    body.rules = [];
  }
  try {
    body.items = raw.items ? JSON.parse(raw.items) : [];
  } catch {
    body.items = [];
  }

  return body;
}

/* ------------------------------ CRUD ------------------------------ */

/** POST /api/collections — admin only. */
export async function createCollection(
  input: FormData | Record<string, any>,
): Promise<CollectionActionResult<ApiCollection>> {
  try {
    const body =
      input instanceof FormData ? formDataToBackendBody(input) : input;
    const res = await api.post<{ success: boolean; data: ApiCollection }>(
      "/collections",
      body,
    );
    return { success: true, data: res.data.data };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** PATCH /api/collections/:id — admin only. */
export async function updateCollection(
  id: string,
  input: FormData | Record<string, any>,
): Promise<CollectionActionResult<ApiCollection>> {
  try {
    const body =
      input instanceof FormData ? formDataToBackendBody(input) : input;
    const res = await api.patch<{ success: boolean; data: ApiCollection }>(
      `/collections/${id}`,
      body,
    );
    return { success: true, data: res.data.data };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** GET /api/collections/:id — admin only. Returns populated `items`. */
export async function getCollectionById(
  id: string,
): Promise<CollectionActionResult<ApiCollection>> {
  try {
    const res = await api.get<{ data: ApiCollection }>(`/collections/${id}`);
    return { success: true, data: res.data.data };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** DELETE /api/collections/:id — admin only. */
export async function deleteCollection(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api.delete(`/collections/${id}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** DELETE /api/collections/:id/image — admin only. */
export async function deleteCollectionImage(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api.delete(`/collections/${id}/image`);
    return { success: true };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/* -------------------------- resolved list ------------------------- */

/** GET /api/collections — admin only. Plain (unresolved) docs. */
export async function getAllCollections(
  targetType?: string,
): Promise<CollectionActionResult<ApiCollection[]>> {
  try {
    const res = await api.get<{ data: ApiCollection[] }>("/collections", {
      params: { targetType: targetType || undefined },
    });
    return {
      success: true,
      data: Array.isArray(res.data?.data) ? res.data.data : [],
    };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** GET /api/collections/resolved — admin only. */
export async function getResolvedCollections(opts?: {
  targetType?: string;
  status?: "active" | "inactive";
  resolveRecommendations?: boolean;
}): Promise<CollectionActionResult<ResolvedCollectionRow[]>> {
  try {
    const res = await api.get<{ data: ResolvedCollectionRow[] }>(
      "/collections/resolved",
      {
        params: {
          targetType: opts?.targetType || undefined,
          status: opts?.status || undefined,
          resolveRecommendations: opts?.resolveRecommendations
            ? "true"
            : undefined,
        },
      },
    );
    return { success: true, data: res.data.data ?? [] };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/* ------------------------- picker helper -------------------------- */

/** GET /api/collections/available-items — admin only. */
export async function fetchAvailableItems(
  targetType: string,
  search?: string,
  sortOrder: "asc" | "desc" = "asc",
): Promise<CollectionActionResult<AvailableItem[]>> {
  try {
    const res = await api.get<{ data: AvailableItem[] }>(
      "/collections/available-items",
      {
        params: {
          targetType,
          search: search || undefined,
          sortOrder,
        },
      },
    );
    return { success: true, data: res.data.data ?? [] };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

// lib/api/collection.ts (append)

export interface ReferenceOption {
  _id: string;
  name: string;
}

/**
 * GET /api/collections/ref-options/:refType — admin only.
 * Used by RefPicker for the block "source" selector.
 * NOTE: does not return imageUrl (unlike /available-items).
 */
export async function fetchReferenceOptions(
  refType: string,
  search?: string,
): Promise<CollectionActionResult<ReferenceOption[]>> {
  try {
    const res = await api.get<{ data: ReferenceOption[] }>(
      `/collections/ref-options/${encodeURIComponent(refType)}`,
      { params: { search: search || undefined } },
    );
    return { success: true, data: res.data.data ?? [] };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}
