// lib/api/category-property-draft.ts
import api from "@/lib/api";

export interface StoredDraft<T> {
  version: number;
  savedAt: number; // ms since epoch — matches the shape the hook expects
  data: T;
}

/**
 * GET /api/category-property-drafts/:key — admin only.
 * `userId` is accepted for backwards compatibility with the old server-action
 * signature but is ignored — the backend derives the user from the session.
 */
export async function fetchCategoryPropertyDraft<T>(
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId?: string | null,
): Promise<StoredDraft<T> | null> {
  const res = await api.get<{ data: StoredDraft<T> | null }>(
    `/category-property-drafts/${encodeURIComponent(key)}`,
  );
  return res.data?.data ?? null;
}

/** PUT /api/category-property-drafts/:key — admin only */
export async function saveCategoryPropertyDraft<T>(args: {
  key: string;
  userId?: string | null;
  version: number;
  data: T;
}): Promise<{ savedAt: number }> {
  const res = await api.put<{ data: { savedAt: number } }>(
    `/category-property-drafts/${encodeURIComponent(args.key)}`,
    { version: args.version, data: args.data },
  );
  return res.data.data;
}

/** DELETE /api/category-property-drafts/:key — admin only */
export async function deleteCategoryPropertyDraft(
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId?: string | null,
): Promise<{ success: boolean }> {
  const res = await api.delete<{ success: boolean }>(
    `/category-property-drafts/${encodeURIComponent(key)}`,
  );
  return res.data;
}
