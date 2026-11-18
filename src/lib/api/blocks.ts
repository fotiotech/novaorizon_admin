// lib/api/blocks.ts
import { api } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface SourcePreviewData {
  _id: string;
  name: string;
  imageUrl: string | null;
  meta: Record<string, any>;
}

export type BlocksResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; message: string; missing?: boolean };

/* ------------------------------------------------------------------ */
/* FormData → JSON (dot-notation → nested, JSON strings → parsed)     */
/* ------------------------------------------------------------------ */

function setNested(target: Record<string, any>, key: string, value: any) {
  const parts = key.split(".");
  let cur: Record<string, any> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (typeof value === "string" && /^[[{]/.test(value.trim())) {
    try {
      cur[last] = JSON.parse(value);
      return;
    } catch {
      /* fall through, treat as literal */
    }
  }
  cur[last] = value;
}

function formDataToJson(fd: FormData): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of fd.entries()) setNested(out, key, value);
  return out;
}

/* ------------------------------------------------------------------ */
/* Error normalisation                                                */
/* ------------------------------------------------------------------ */

function fail(
  err: any,
  fallback: string,
): Extract<BlocksResult, { success: false }> {
  const r = err?.response?.data;
  const message =
    (typeof r?.message === "string" && r.message) ||
    (typeof r?.error === "string" && r.error) ||
    fallback;
  return { success: false, error: message, message, ...(r ?? {}) };
}

/* ------------------------------------------------------------------ */
/* Reads                                                              */
/* ------------------------------------------------------------------ */

export async function getAllBlocks(): Promise<BlocksResult<any[]>> {
  try {
    const res = await api.get("/blocks");
    return { success: true, data: res.data.data };
  } catch (err) {
    return fail(err, "Failed to load blocks");
  }
}

export async function getBlockById(id: string): Promise<BlocksResult<any>> {
  try {
    const res = await api.get(`/blocks/${id}`);
    return { success: true, data: res.data.data };
  } catch (err) {
    return fail(err, "Failed to load block");
  }
}

export async function getSourcePreview(
  sourceType: string,
  id: string,
): Promise<BlocksResult<SourcePreviewData>> {
  try {
    const res = await api.get(`/blocks/source-preview/${sourceType}/${id}`);
    return { success: true, data: res.data.data };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return {
        success: false,
        error: "Not found",
        message: "Not found",
        missing: true,
      };
    }
    return fail(err, "Failed to load preview");
  }
}

/* ------------------------------------------------------------------ */
/* Writes                                                             */
/* ------------------------------------------------------------------ */

export async function createBlock(fd: FormData): Promise<BlocksResult<any>> {
  try {
    const res = await api.post("/blocks", formDataToJson(fd));
    return { success: true, data: res.data.data };
  } catch (err) {
    return fail(err, "Failed to create block");
  }
}

export async function updateBlock(
  id: string,
  fd: FormData,
): Promise<BlocksResult<any>> {
  try {
    const res = await api.patch(`/blocks/${id}`, formDataToJson(fd));
    return { success: true, data: res.data.data };
  } catch (err) {
    return fail(err, "Failed to update block");
  }
}

export async function deleteBlock(id: string): Promise<BlocksResult<void>> {
  try {
    await api.delete(`/blocks/${id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return fail(err, "Failed to delete");
  }
}

export async function reorderBlocks(
  location: string,
  orderedIds: string[],
): Promise<BlocksResult<void>> {
  try {
    await api.post("/blocks/reorder", { location, orderedIds });
    return { success: true, data: undefined };
  } catch (err) {
    return fail(err, "Failed to reorder");
  }
}
