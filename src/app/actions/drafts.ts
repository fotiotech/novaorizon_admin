// app/actions/drafts.ts (or append to products.ts)

"use server";

import { connection } from "@/utils/connection";
import Draft from "@/models/Draft"; // we'll define the model below
import { auth } from "../auth";

// ---------- Server Actions ----------

export async function saveProductDraft(productId: string, data: any) {
  try {
    await connection();
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }
    const userId = session.user.id;

    // Upsert draft
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

export async function getProductDraft(productId: string) {
  try {
    await connection();
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }
    const userId = session.user.id;

    const draft = await Draft.findOne({ userId, productId });
    if (!draft) return null;
    return draft.data;
  } catch (error) {
    console.error("Error fetching draft:", error);
    return null;
  }
}

export async function deleteProductDraft(productId: string) {
  try {
    await connection();
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }
    const userId = session.user.id;

    await Draft.deleteOne({ userId, productId });
    return { success: true };
  } catch (error) {
    console.error("Error deleting draft:", error);
    return { success: false, error: "Failed to delete draft" };
  }
}
