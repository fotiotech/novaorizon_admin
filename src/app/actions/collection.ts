"use server";

import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { Collection } from "@/models/Collection";

export async function createCollection(formData: FormData) {
  try {
    await connection();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const category_id = formData.get("category_id") as string;
    const status = formData.get("status") as string;
    const rulesJson = formData.get("rules") as string;

    if (!name?.trim()) {
      return { success: false, error: "Name is required" };
    }
    if (!category_id) {
      return { success: false, error: "Category ID is required" };
    }

    let rules = [];
    try {
      rules = rulesJson ? JSON.parse(rulesJson) : [];

      if (!Array.isArray(rules)) {
        return { success: false, error: "Rules must be an array" };
      }

      for (const rule of rules) {
        if (
          !rule.attribute ||
          !rule.operator ||
          typeof rule.position !== "number"
        ) {
          return {
            success: false,
            error: "Each rule must have an attribute, operator, and position",
          };
        }
      }

      rules.sort((a, b) => a.position - b.position);
    } catch (e) {
      return { success: false, error: "Invalid rules format" };
    }

    const collection = new Collection({
      name,
      description,
      category_id: new mongoose.Types.ObjectId(category_id),
      rules,
      status: status === "inactive" ? "inactive" : "active",
    });

    await collection.save();
    revalidatePath("/collection");
    return { success: true, data: collection.toObject() };
  } catch (error) {
    console.error("Error creating collection:", error);
    return { success: false, error: "Failed to create collection" };
  }
}

export async function getCollections() {
  try {
    await connection();
    const collections = await Collection.find().sort({ created_at: -1 }).lean();
    return { success: true, data: collections };
  } catch (error) {
    console.error("Error fetching collections:", error);
    return { success: false, error: "Failed to fetch collections" };
  }
}

export async function updateCollection(id: string, formData: FormData) {
  try {
    await connection();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const category_id = formData.get("category_id") as string;
    const status = formData.get("status") as string;
    const rulesJson = formData.get("rules") as string;

    let rules = [];
    try {
      rules = rulesJson ? JSON.parse(rulesJson) : [];

      if (!Array.isArray(rules)) {
        return { success: false, error: "Rules must be an array" };
      }

      for (const rule of rules) {
        if (
          !rule.attribute ||
          !rule.operator ||
          typeof rule.position !== "number"
        ) {
          return {
            success: false,
            error: "Each rule must have an attribute, operator, and position",
          };
        }
      }

      rules.sort((a, b) => a.position - b.position);
    } catch (e) {
      return { success: false, error: "Invalid rules format" };
    }

    const updates = {
      name,
      description,
      category_id: new mongoose.Types.ObjectId(category_id),
      rules,
      status: status === "inactive" ? "inactive" : "active",
    };

    const collection = await Collection.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, lean: true }
    );

    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    revalidatePath("/collection");
    return { success: true, data: collection };
  } catch (error) {
    console.error("Error updating collection:", error);
    return { success: false, error: "Failed to update collection" };
  }
}

export async function getCollectionById(id: string) {
  try {
    await connection();
    const collection = await Collection.findById(id).lean();

    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    return { success: true, data: collection };
  } catch (error) {
    console.error("Error fetching collection:", error);
    return { success: false, error: "Failed to fetch collection" };
  }
}

export async function deleteCollection(id: string) {
  try {
    await connection();

    const collection = await Collection.findByIdAndDelete(id);

    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    revalidatePath("/collection");
    return { success: true };
  } catch (error) {
    console.error("Error deleting collection:", error);
    return { success: false, error: "Failed to delete collection" };
  }
}
