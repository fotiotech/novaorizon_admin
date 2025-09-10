"use server";

import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { ProductCollection } from "@/models/ProductCollection";
import Product from "@/models/Product";
import "@/models/Category";

// Helper function to parse rule values based on their expected type
function parseRuleValue(value: any, operator: string) {
  if (operator === "$in" || operator === "$nin") {
    // Handle array values
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;

        // Handle comma-separated values
        if (value.includes(",")) {
          return value.split(",").map((item: string) => item.trim());
        }

        // Single value in array
        return [value];
      } catch {
        // If not JSON, treat as comma-separated or single value
        if (value.includes(",")) {
          return value.split(",").map((item: string) => item.trim());
        }
        return [value];
      }
    }
    return [value];
  }

  // Handle numeric values for comparison operators
  if (["$lt", "$lte", "$gt", "$gte"].includes(operator)) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  // Handle boolean values
  if (value === "true") return true;
  if (value === "false") return false;

  // Return as is for other cases
  return value;
}

// Helper to build MongoDB query from rules
function buildQueryFromRules(rules: any[]) {
  if (!rules || rules.length === 0) return {};

  const query: any = { $and: [] };

  for (const rule of rules) {
    if (!rule.attribute || !rule.operator) continue;

    const value = parseRuleValue(rule.value, rule.operator);

    // Handle category_id specially if it's an ObjectId
    if (rule.attribute === "category_id") {
      if (Array.isArray(value)) {
        // Handle array of values for $in/$nin operators
        const objectIds = value
          .filter((v) => mongoose.Types.ObjectId.isValid(v))
          .map((v) => new mongoose.Types.ObjectId(v));

        if (objectIds.length > 0) {
          query.$and.push({
            [rule.attribute]: { [rule.operator]: objectIds },
          });
        }
      } else if (mongoose.Types.ObjectId.isValid(value)) {
        query.$and.push({
          [rule.attribute]: new mongoose.Types.ObjectId(value),
        });
      }
    } else {
      query.$and.push({
        [rule.attribute]: { [rule.operator]: value },
      });
    }
  }

  return query.$and.length > 0 ? query : {};
}

export async function getCollectionsWithProducts() {
  try {
    await connection();

    const collections = await ProductCollection.find({})
      .populate("category_id", "name")
      .sort({ created_at: -1 })
      .lean();

    const results = [];

    for (const collection of collections) {
      // Build query from rules
      const query = buildQueryFromRules(collection.rules);

      let matchingProducts: any = [];

      if (Object.keys(query).length > 0) {
        matchingProducts = await Product.find(query)
          .populate("category_id", "name")
          .limit(50) // Limit products to avoid overloading
          .lean();
      }

      results.push({
        collection: {
          _id: collection._id,
          name: collection.name,
          display: collection.display,
          description: collection.description,
          category: collection.category_id,
          rules: collection.rules,
          status: collection.status,
          created_at: collection.created_at,
          updated_at: collection.updated_at,
        },
        products: matchingProducts,
        productCount: matchingProducts.length,
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

export async function createCollection(formData: FormData) {
  try {
    await connection();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const display = formData.get("display") as string;
    const category_id = formData.get("category_id") as string;
    const status = formData.get("status") as string;
    const rulesJson = formData.get("rules") as string;

    // Validation
    if (!name?.trim()) {
      return { success: false, error: "Name is required" };
    }

    if (!category_id) {
      return { success: false, error: "Category is required" };
    }

    if (!mongoose.Types.ObjectId.isValid(category_id)) {
      return { success: false, error: "Invalid category ID" };
    }

    // Parse and validate rules
    let rules = [];
    try {
      rules = rulesJson ? JSON.parse(rulesJson) : [];

      if (!Array.isArray(rules)) {
        return { success: false, error: "Rules must be an array" };
      }

      // Validate each rule
      for (const [index, rule] of rules.entries()) {
        if (!rule.attribute || !rule.operator) {
          return {
            success: false,
            error: `Each rule must have an attribute and operator (rule ${
              index + 1
            })`,
          };
        }

        if (
          rule.value === undefined ||
          rule.value === null ||
          rule.value === ""
        ) {
          return {
            success: false,
            error: `Value is required for rule with attribute ${
              rule.attribute
            } (rule ${index + 1})`,
          };
        }

        // Set position if not provided
        if (typeof rule.position !== "number") {
          rule.position = index;
        }
      }

      // Sort rules by position
      rules.sort((a, b) => a.position - b.position);
    } catch (e) {
      console.error("Error parsing rules:", e);
      return { success: false, error: "Invalid rules format" };
    }

    // Check if collection with same name already exists
    const existingCollection = await ProductCollection.findOne({
      name: name.trim(),
    });

    if (existingCollection) {
      return {
        success: false,
        error: "A collection with this name already exists",
      };
    }

    // Create the collection
    const collection = new ProductCollection({
      name: name.trim(),
      description: description?.trim() || "",
      display: display || "grid",
      category_id: new mongoose.Types.ObjectId(category_id),
      rules,
      status: status || "active",
    });

    await collection.save();
    revalidatePath("/collection");

    return {
      success: true,
      data: collection.toObject(),
      message: "Collection created successfully",
    };
  } catch (error: any) {
    console.error("Error creating collection:", error);
    return {
      success: false,
      error: "Failed to create collection",
    };
  }
}

export async function updateCollection(id: string, formData: FormData) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }

    await connection();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const display = formData.get("display") as string;
    const category_id = formData.get("category_id") as string;
    const status = formData.get("status") as string;
    const rulesJson = formData.get("rules") as string;

    // Validation
    if (!name?.trim()) {
      return { success: false, error: "Name is required" };
    }

    if (!category_id) {
      return { success: false, error: "Category is required" };
    }

    if (!mongoose.Types.ObjectId.isValid(category_id)) {
      return { success: false, error: "Invalid category ID" };
    }

    // Parse and validate rules
    let rules = [];
    try {
      rules = rulesJson ? JSON.parse(rulesJson) : [];

      if (!Array.isArray(rules)) {
        return { success: false, error: "Rules must be an array" };
      }

      for (const [index, rule] of rules.entries()) {
        if (!rule.attribute || !rule.operator) {
          return {
            success: false,
            error: `Each rule must have an attribute and operator (rule ${
              index + 1
            })`,
          };
        }

        if (
          rule.value === undefined ||
          rule.value === null ||
          rule.value === ""
        ) {
          return {
            success: false,
            error: `Value is required for rule with attribute ${
              rule.attribute
            } (rule ${index + 1})`,
          };
        }

        // Set position if not provided
        if (typeof rule.position !== "number") {
          rule.position = index;
        }
      }

      rules.sort((a, b) => a.position - b.position);
    } catch (e) {
      console.error("Error parsing rules:", e);
      return { success: false, error: "Invalid rules format" };
    }

    // Check if another collection with the same name already exists
    const existingCollection = await ProductCollection.findOne({
      name: name.trim(),
      _id: { $ne: new mongoose.Types.ObjectId(id) },
    });

    if (existingCollection) {
      return {
        success: false,
        error: "Another collection with this name already exists",
      };
    }

    // Update the collection
    const updates = {
      name: name.trim(),
      description: description?.trim() || "",
      display: display || "grid",
      category_id: new mongoose.Types.ObjectId(category_id),
      rules,
      status: status || "active",
      updated_at: new Date(),
    };

    const collection = await ProductCollection.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    revalidatePath("/collection");
    return {
      success: true,
      data: collection,
      message: "Collection updated successfully",
    };
  } catch (error: any) {
    console.error("Error updating collection:", error);
    return {
      success: false,
      error: "Failed to update collection",
    };
  }
}

export async function getCollectionById(id: string) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }

    await connection();

    const collection = await ProductCollection.findById(id)
      .populate("category_id", "name")
      .lean();

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }

    await connection();

    const collection = await ProductCollection.findByIdAndDelete(id);

    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    revalidatePath("/collection");
    return {
      success: true,
      message: "Collection deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting collection:", error);
    return { success: false, error: "Failed to delete collection" };
  }
}
