"use server";

import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import Product from "@/models/Product";
import "@/models/Category";
import { Collection } from "@/models/Collection";
import { deleteS3Object } from "./s3";

// ---------- Helper: parse rule value ----------
function parseRuleValue(value: any, operator: string) {
  if (operator === "$in" || operator === "$nin") {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (value.includes(",")) {
          return value.split(",").map((item: string) => item.trim());
        }
        return [value];
      } catch {
        if (value.includes(",")) {
          return value.split(",").map((item: string) => item.trim());
        }
        return [value];
      }
    }
    return [value];
  }

  if (["$lt", "$lte", "$gt", "$gte"].includes(operator)) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

// ---------- Build query for a given model ----------
function buildQueryFromRules(rules: any[], targetModel: string) {
  if (!rules || rules.length === 0) return {};

  const query: any = { $and: [] };

  for (const rule of rules) {
    if (!rule.attribute || !rule.operator) continue;
    const value = parseRuleValue(rule.value, rule.operator);

    if (targetModel === "Product" && rule.attribute === "category_id") {
      if (Array.isArray(value)) {
        const objectIds = value
          .filter((v) => mongoose.Types.ObjectId.isValid(v))
          .map((v) => new mongoose.Types.ObjectId(v));
        if (objectIds.length) {
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

// ---------- Get all collections ----------
export async function getAllCollections() {
  try {
    await connection();
    const collections = await Collection.find().sort({
      order: 1,
      createdAt: -1,
    });
    return { success: true, data: JSON.parse(JSON.stringify(collections)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Get collections with resolved items/products ----------
export async function getCollectionsWithProducts() {
  try {
    await connection();
    const collections = await Collection.find({})
      .populate("items")
      .sort({ order: 1, created_at: -1 })
      .lean();

    const results = [];

    for (const collection of collections) {
      let matchingItems = [];

      if (collection.type === "rule") {
        const Model =
          collection.targetType === "Product" ? Product : Collection;
        const query = buildQueryFromRules(
          collection.rules,
          collection.targetType,
        );
        if (Object.keys(query).length > 0) {
          matchingItems = await Model.find(query)
            .populate("category_id", "name")
            .limit(50)
            .lean();
        }
      } else {
        matchingItems = collection.items || [];
      }

      results.push({
        collection: {
          _id: collection._id,
          name: collection.name,
          description: collection.description,
          imageUrl: collection.imageUrl,
          type: collection.type,
          targetType: collection.targetType,
          rules: collection.rules,
          items: collection.items,
          status: collection.status,
          order: collection.order,
          showName: collection.showName,
          created_at: collection.created_at,
          updated_at: collection.updated_at,
        },
        items: matchingItems,
        itemCount: matchingItems.length,
      });
    }

    return { success: true, data: results };
  } catch (error) {
    console.error("Error fetching collections with items:", error);
    return { success: false, error: "Failed to fetch collections" };
  }
}

// ---------- Create collection ----------
export async function createCollection(formData: FormData) {
  try {
    await connection();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const status = formData.get("status") as string;
    const type = (formData.get("type") as string) || "rule";
    const targetType = (formData.get("targetType") as string) || "Product";
    const rulesJson = formData.get("rules") as string;
    const itemsJson = formData.get("items") as string;
    const order = parseInt(formData.get("order") as string) || 0;
    const showName = formData.get("showName") === "true";

    if (!name?.trim()) {
      return { success: false, error: "Name is required" };
    }

    if (!["rule", "manual"].includes(type)) {
      return { success: false, error: "Invalid collection type" };
    }
    if (!["Product", "Collection"].includes(targetType)) {
      return { success: false, error: "Invalid target type" };
    }

    let rules = [];
    if (type === "rule") {
      try {
        rules = rulesJson ? JSON.parse(rulesJson) : [];
        if (!Array.isArray(rules)) {
          return { success: false, error: "Rules must be an array" };
        }
        for (const [index, rule] of rules.entries()) {
          if (!rule.attribute || !rule.operator) {
            return {
              success: false,
              error: `Each rule must have an attribute and operator (rule ${index + 1})`,
            };
          }
          if (
            rule.value === undefined ||
            rule.value === null ||
            rule.value === ""
          ) {
            return {
              success: false,
              error: `Value is required for rule with attribute ${rule.attribute} (rule ${index + 1})`,
            };
          }
          if (typeof rule.position !== "number") rule.position = index;
        }
        rules.sort((a, b) => a.position - b.position);
      } catch (e) {
        return { success: false, error: "Invalid rules format" };
      }
    }

    let items = [];
    if (type === "manual") {
      try {
        items = itemsJson ? JSON.parse(itemsJson) : [];
        if (!Array.isArray(items)) {
          return { success: false, error: "Items must be an array" };
        }
        for (const id of items) {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            return { success: false, error: `Invalid item ID: ${id}` };
          }
        }
      } catch (e) {
        return { success: false, error: "Invalid items format" };
      }
    }

    const existing = await Collection.findOne({ name: name.trim() });
    if (existing) {
      return {
        success: false,
        error: "A collection with this name already exists",
      };
    }

    const collection = new Collection({
      name: name.trim(),
      description: description?.trim() || "",
      imageUrl,
      status: status || "active",
      type,
      targetType,
      rules: type === "rule" ? rules : [],
      items: type === "manual" ? items : [],
      order,
      showName,
    });

    await collection.save();
    revalidatePath("/marketing/content/navigation/collection");
    return {
      success: true,
      data: collection.toObject(),
      message: "Collection created successfully",
    };
  } catch (error: any) {
    console.error("Error creating collection:", error);
    return { success: false, error: "Failed to create collection" };
  }
}

// ---------- Update collection ----------
export async function updateCollection(id: string, formData: FormData) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }
    await connection();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const status = formData.get("status") as string;
    const type = formData.get("type") as string;
    const targetType = formData.get("targetType") as string;
    const rulesJson = formData.get("rules") as string;
    const itemsJson = formData.get("items") as string;
    const order = parseInt(formData.get("order") as string) || 0;
    const showName = formData.get("showName") === "true";

    console.log("imageUrl", imageUrl);

    if (!name?.trim()) return { success: false, error: "Name is required" };
    if (!["rule", "manual"].includes(type)) {
      return { success: false, error: "Invalid collection type" };
    }
    if (!["Product", "Collection"].includes(targetType)) {
      return { success: false, error: "Invalid target type" };
    }

    let rules = [];
    if (type === "rule") {
      try {
        rules = rulesJson ? JSON.parse(rulesJson) : [];
        if (!Array.isArray(rules)) {
          return { success: false, error: "Rules must be an array" };
        }
        for (const [index, rule] of rules.entries()) {
          if (!rule.attribute || !rule.operator) {
            return {
              success: false,
              error: `Each rule must have an attribute and operator (rule ${index + 1})`,
            };
          }
          if (
            rule.value === undefined ||
            rule.value === null ||
            rule.value === ""
          ) {
            return {
              success: false,
              error: `Value is required for rule with attribute ${rule.attribute} (rule ${index + 1})`,
            };
          }
          if (typeof rule.position !== "number") rule.position = index;
        }
        rules.sort((a, b) => a.position - b.position);
      } catch (e) {
        return { success: false, error: "Invalid rules format" };
      }
    }

    let items = [];
    if (type === "manual") {
      try {
        items = itemsJson ? JSON.parse(itemsJson) : [];
        if (!Array.isArray(items)) {
          return { success: false, error: "Items must be an array" };
        }
        for (const id of items) {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            return { success: false, error: `Invalid item ID: ${id}` };
          }
        }
      } catch (e) {
        return { success: false, error: "Invalid items format" };
      }
    }

    const existing = await Collection.findOne({
      name: name.trim(),
      _id: { $ne: new mongoose.Types.ObjectId(id) },
    });
    if (existing) {
      return {
        success: false,
        error: "Another collection with this name already exists",
      };
    }

    const updates = {
      name: name.trim(),
      description: description?.trim() || "",
      imageUrl,
      status: status || "active",
      type,
      targetType,
      rules: type === "rule" ? rules : [],
      items: type === "manual" ? items : [],
      order,
      showName,
      updated_at: new Date(),
    };

    const collection = await Collection.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    revalidatePath("/marketing/content/navigation/collection");
    return {
      success: true,
      data: collection,
      message: "Collection updated successfully",
    };
  } catch (error: any) {
    console.error("Error updating collection:", error);
    return { success: false, error: "Failed to update collection" };
  }
}

// ---------- Get collection by ID ----------
export async function getCollectionById(id: string) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }
    await connection();
    const collection = await Collection.findById(id).populate("items").lean();
    console.log("collection by id", collection);

    if (!collection) {
      return { success: false, error: "Collection not found" };
    }
    return { success: true, data: collection };
  } catch (error) {
    console.error("Error fetching collection:", error);
    return { success: false, error: "Failed to fetch collection" };
  }
}

// ---------- Delete collection ----------
export async function deleteCollection(id: string) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }
    await connection();
    const collection = await Collection.findByIdAndDelete(id);
    if (!collection) {
      return { success: false, error: "Collection not found" };
    }
    revalidatePath("/marketing/content/navigation/collection");
    return { success: true, message: "Collection deleted successfully" };
  } catch (error) {
    console.error("Error deleting collection:", error);
    return { success: false, error: "Failed to delete collection" };
  }
}

// ---------- Delete image ----------
export async function deleteCollectionImage(collectionId: string) {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return { success: false, error: "Invalid collection ID" };
    }
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return { success: false, error: "Collection not found" };
    }
    if (!collection.imageUrl) {
      return { success: false, error: "No image to delete" };
    }
    await deleteS3Object(collection.imageUrl);
    collection.imageUrl = "";
    await collection.save();
    revalidatePath("/marketing/content/navigation/collections");
    return { success: true };
  } catch (error) {
    console.error("Error deleting collection image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}

// ---------- Fetch items for manual selection (status filter skipped) ----------
export async function fetchAvailableItems(targetType: string, search?: string) {
  try {
    await connection();
    const Model = targetType === "Product" ? Product : Collection;
    const filter: any = {};

    // ⛔️ Status filter is SKIPPED for now – all items are shown regardless of status.
    // If you want to filter by status later, uncomment the next line:
    // filter.status = "active";

    if (search) {
      const searchField = targetType === "Product" ? "title" : "name";
      filter[searchField] = { $regex: search, $options: "i" };
    }

    const items = await Model.find(filter)
      .select(
        targetType === "Product" ? "_id title imageUrl" : "_id name imageUrl",
      )
      .limit(50)
      .lean();

    const normalized = items.map((item: any) => ({
      _id: item._id.toString(),
      name: targetType === "Product" ? item.title : item.name,
      imageUrl: item.imageUrl || null,
    }));

    return { success: true, data: normalized };
  } catch (error) {
    console.error("Error fetching available items:", error);
    return { success: false, error: "Failed to fetch items" };
  }
}
