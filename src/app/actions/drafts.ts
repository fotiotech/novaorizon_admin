"use server";

import { connection } from "@/utils/connection";
import Draft from "@/models/Draft";
import { auth } from "../auth";

export async function saveProductDraft(productId: string, data: any) {
  try {
    await connection();
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    await Draft.findOneAndUpdate(
      { userId, productId },
      { data, updatedAt: new Date() },
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
