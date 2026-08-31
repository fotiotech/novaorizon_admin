"use server";

import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Promotion from "@/models/Promotion";
import Page from "@/models/Page";
import { Collection } from "@/models/Collection";
import { deleteS3Object } from "./s3";

// ---------- Helper: get model by targetType ----------
function getModelForTargetType(targetType: string) {
  switch (targetType) {
    case "Product":
      return Product;
    case "Category":
      return Category;
    case "Brand":
      return Brand;
    case "Promotion":
      return Promotion;
    case "Page":
      return Page;
    case "Collection":
      return Collection;
    default:
      return null;
  }
}

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

// ---------- Build query from rules (only for Product & Collection) ----------
function buildQueryFromRules(rules: any[], targetType: string) {
  if (!["Product", "Collection"].includes(targetType)) return {};
  if (!rules || rules.length === 0) return {};

  const query: any = { $and: [] };

  for (const rule of rules) {
    if (!rule.attribute || !rule.operator) continue;
    const value = parseRuleValue(rule.value, rule.operator);

    if (targetType === "Product" && rule.attribute === "category_id") {
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

// ---------- Get collections with resolved items (for admin preview) ----------
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
        const Model = getModelForTargetType(collection.targetType);
        if (!Model) continue;
        const query = buildQueryFromRules(
          collection.rules,
          collection.targetType,
        );
        if (Object.keys(query).length > 0) {
          matchingItems = await (Model as any).find(query).limit(50).lean();
        }
      } else if (collection.type === "manual") {
        matchingItems = collection.items || [];
      } else if (collection.type === "recommendation") {
        // Recommendation collections are dynamic; we don't pre-fetch items for admin preview.
        // You could optionally call the recommendation functions here with a default user,
        // but it's usually unnecessary in the admin.
        matchingItems = [];
      } else if (collection.type === "related") {
        // Related collections require a product context, which the admin list does not have.
        matchingItems = [];
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
          recommendationType: collection.recommendationType,
          recommendationLimit: collection.recommendationLimit,
          created_at: collection.created_at,
          updated_at: collection.updated_at,
        },
        items: matchingItems,
        itemCount: matchingItems.length,
        requiresProductContext: collection.type === "related",
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
    let targetType = (formData.get("targetType") as string) || "Product";
    const rulesJson = formData.get("rules") as string;
    const itemsJson = formData.get("items") as string;
    const order = parseInt(formData.get("order") as string) || 0;
    const showName = formData.get("showName") === "true";

    // --- Recommendation fields ---
    const recommendationType =
      (formData.get("recommendationType") as string) || "";
    const recommendationLimit =
      parseInt(formData.get("recommendationLimit") as string) || 10;

    // --- Validation ---
    if (!name?.trim()) {
      return { success: false, error: "Name is required" };
    }

    if (!["rule", "manual", "recommendation", "related"].includes(type)) {
      return { success: false, error: "Invalid collection type" };
    }
    if (["recommendation", "related"].includes(type)) {
      targetType = "Product";
    }
    const validTargets = [
      "Category",
      "Product",
      "Brand",
      "Collection",
      "Promotion",
      "Page",
    ];
    if (!validTargets.includes(targetType)) {
      return { success: false, error: "Invalid target type" };
    }

    // Validate dynamic product collection configuration
    if (type === "recommendation") {
      if (
        !["trending", "personalized", "recentlyViewed"].includes(
          recommendationType,
        )
      ) {
        return { success: false, error: "Invalid recommendation type" };
      }
    }
    if (["recommendation", "related"].includes(type) && recommendationLimit < 1) {
      return {
        success: false,
        error: "Collection item limit must be at least 1",
      };
    }

    // Parse rules / items only for relevant types
    let rules = [];
    let items = [];

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
    } else if (type === "manual") {
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

    // Check duplicate name
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
      recommendationType:
        type === "recommendation" ? recommendationType : undefined,
      recommendationLimit:
        type === "recommendation" || type === "related"
          ? recommendationLimit
          : undefined,
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
    let targetType = formData.get("targetType") as string;
    const rulesJson = formData.get("rules") as string;
    const itemsJson = formData.get("items") as string;
    const order = parseInt(formData.get("order") as string) || 0;
    const showName = formData.get("showName") === "true";

    const recommendationType =
      (formData.get("recommendationType") as string) || "";
    const recommendationLimit =
      parseInt(formData.get("recommendationLimit") as string) || 10;

    if (!name?.trim()) return { success: false, error: "Name is required" };
    if (!["rule", "manual", "recommendation", "related"].includes(type)) {
      return { success: false, error: "Invalid collection type" };
    }
    if (["recommendation", "related"].includes(type)) {
      targetType = "Product";
    }
    const validTargets = [
      "Category",
      "Product",
      "Brand",
      "Collection",
      "Promotion",
      "Page",
    ];
    if (!validTargets.includes(targetType)) {
      return { success: false, error: "Invalid target type" };
    }

    if (type === "recommendation") {
      if (
        !["trending", "personalized", "recentlyViewed"].includes(
          recommendationType,
        )
      ) {
        return { success: false, error: "Invalid recommendation type" };
      }
    }
    if (["recommendation", "related"].includes(type) && recommendationLimit < 1) {
      return {
        success: false,
        error: "Collection item limit must be at least 1",
      };
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
      recommendationType:
        type === "recommendation" ? recommendationType : undefined,
      recommendationLimit:
        type === "recommendation" || type === "related"
          ? recommendationLimit
          : undefined,
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

// ---------- Fetch available items for manual selection ----------
export async function fetchAvailableItems(targetType: string, search?: string) {
  try {
    await connection();
    const Model = getModelForTargetType(targetType);
    if (!Model) {
      return {
        success: false,
        error: `Unsupported target type: ${targetType}`,
      };
    }

    const filter: any = {};
    // Optionally filter by status if model has status field
    // filter.status = "active"; // uncomment if you want active only

    if (search) {
      const searchField = targetType === "Product" ? "title" : "name";
      filter[searchField] = { $regex: search, $options: "i" };
    }

    const items = await (Model as any)
      .find(filter)
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
