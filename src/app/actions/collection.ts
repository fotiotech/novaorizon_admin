"use server";

import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { Collection } from "@/models/Collection";
import Product from "@/models/Product";

export async function createCollection(formData: FormData) {
  try {
    await connection();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const display = formData.get("display") as string;
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
      display,
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

export async function getCollectionsWithProducts() {
  try {
    await connection();
    const collections = await Collection.find({ status: "active" })
      .sort({ created_at: -1 })
      .lean();

    const results = [];

    for (const collection of collections) {
      // start by filtering on the collection’s category_id
      const query: Record<string, any> = {
        category_id: collection.category_id._id, // <-- ensures "shop by category"
      };

      for (const rule of collection.rules) {
        const attributePath = rule.attribute; // e.g., "pricing_availability.price"

        // Safely apply rule to query using dot notation
        if (!query[attributePath]) {
          query[attributePath] = {};
        }
        query[attributePath][rule.operator] = rule.value;
      }

      const matchingProducts = await Product.find(query)
        .populate("category_id", "categoryName")
        .lean();

      results.push({
        collection: {
          _id: collection._id,
          name: collection.name,
          display: collection.display,
          description: collection.description,
          category: collection.category_id,
          created_at: collection.created_at,
          updated_at: collection.updated_at,
        },
        products: matchingProducts,
      });
    }

    return { success: true, data: results };
  } catch (error) {
    console.error("Error fetching collections with products:", error);
    return {
      success: false,
      error: "Failed to fetch collections with products",
    };
  }
}

export async function updateCollection(id: string, formData: FormData) {
  try {
    await connection();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const display = formData.get("display") as string;
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
      display,
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
