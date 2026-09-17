"use server";

import { connection } from "@/utils/connection";
import Draft from "@/models/Draft";
import { auth } from "../auth";

/**
 * Force any payload through JSON before persisting.
 *
 * Guarantees the Draft collection never receives:
 *   - Mongoose ObjectIds  → becomes hex string
 *   - Buffers             → becomes { type: 'Buffer', data: [...] }
 *   - Dates               → becomes ISO string
 *   - circular refs       → becomes {}
 *
 * This protects every draft caller (edit autosave, "recreate as draft",
 * new-product staging, …) from silently persisting a shape that later
 * fails Mongoose casting when it's re-read and merged into a product
 * payload.
 */
function toSerializable<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    console.warn("[drafts] JSON round-trip failed; dropping payload", err);
    return {} as T;
  }
}

export async function saveProductDraft(productId: string, data: any) {
  try {
    await connection();
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const safeData = toSerializable(data);

    await Draft.findOneAndUpdate(
      { userId, productId },
      { data: safeData, updatedAt: new Date() },
      { upsert: true, new: true },
    );

    return { success: true };
  } catch (error) {
    console.error("Error saving draft:", error);
    return { success: false, error: "Failed to save draft" };
  }
}

/**
 * Returns `{ data, updatedAt }` (or null). Caller uses `updatedAt` to decide
 * whether the draft is newer than the last server-side save of the product.
 */
export async function getProductDraft(
  productId: string,
): Promise<{ data: any; updatedAt: Date } | null> {
  try {
    await connection();
    const session = await auth();
    if (!session?.user?.id) return null;
    const userId = session.user.id;

    const draft = await Draft.findOne({ userId, productId }).lean();
    if (!draft) return null;
    return {
      data: (draft as any).data,
      updatedAt: (draft as any).updatedAt,
    };
  } catch (error) {
    console.error("Error fetching draft:", error);
    return null;
  }
}

export async function deleteProductDraft(productId: string) {
  try {
    await connection();
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    await Draft.deleteOne({ userId, productId });
    return { success: true };
  } catch (error) {
    console.error("Error deleting draft:", error);
    return { success: false, error: "Failed to delete draft" };
  }
}
