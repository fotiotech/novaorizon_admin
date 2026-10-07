// app/actions/category_property_draft.ts
"use server";

import CategoryPropertyDraft from "@/models/CategoryPropertyDraft";
import { connection } from "@/utils/connection";

export interface CategoryPropertyDraftPayload<T = any> {
  version: number;
  savedAt: number;
  data: T;
}

export async function getCategoryPropertyDraft(
  key: string,
  userId?: string | null,
): Promise<CategoryPropertyDraftPayload | null> {
  if (!key) return null;
  await connection();

  const draft = await CategoryPropertyDraft.findOne({
    key,
    userId: userId ?? null,
  }).lean();

  if (!draft) return null;

  return {
    version: draft.version,
    savedAt: new Date(draft.savedAt).getTime(),
    data: draft.data,
  };
}

export async function saveCategoryPropertyDraft(input: {
  key: string;
  userId?: string | null;
  version: number;
  data: any;
}): Promise<{ savedAt: number }> {
  const { key, userId, version, data } = input;
  if (!key) throw new Error("Draft key is required");

  await connection();

  const savedAt = new Date();
  await CategoryPropertyDraft.findOneAndUpdate(
    { key, userId: userId ?? null },
    { $set: { version, data, savedAt } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return { savedAt: savedAt.getTime() };
}

export async function deleteCategoryPropertyDraft(
  key: string,
  userId?: string | null,
): Promise<{ success: true }> {
  if (!key) return { success: true };
  await connection();
  await CategoryPropertyDraft.deleteOne({ key, userId: userId ?? null });
  return { success: true };
}
