// lib/api/product-draft.ts
import api from "@/lib/api";

export interface ProductDraft<T = Record<string, any>> {
  data: T;
  updatedAt?: string;
  savedAt?: number;
}

function toMessage(err: any): string {
  return err?.response?.data?.message || err?.message || "Draft request failed";
}

/**
 * GET /api/drafts/:key — admin only, scoped to the session user.
 * Returns `{ data, updatedAt, savedAt }`, or `null` when no draft exists.
 */
export async function getProductDraft<T = Record<string, any>>(
  key: string,
): Promise<ProductDraft<T> | null> {
  try {
    const res = await api.get<{ data: ProductDraft<T> | null }>(
      `/drafts/${encodeURIComponent(key)}`,
    );
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * PUT /api/drafts/:key — admin only.
 * `data` is the raw form state (no `version` wrapper — the product draft
 * service doesn't take one, unlike the category-property draft).
 */
export async function saveProductDraft<T = Record<string, any>>(
  key: string,
  data: T,
): Promise<{ savedAt: number }> {
  const res = await api.put<{ data: { savedAt: number } }>(
    `/drafts/${encodeURIComponent(key)}`,
    { data },
  );
  return res.data.data;
}

/** DELETE /api/drafts/:key — admin only. */
export async function deleteProductDraft(key: string): Promise<void> {
  try {
    await api.delete(`/drafts/${encodeURIComponent(key)}`);
  } catch {
    /* silent — mirrors the old server action's swallow-and-move-on */
  }
}

export { toMessage as draftErrorMessage };
