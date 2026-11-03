// app/actions/categoryCollection.ts
"use server";

import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import Category from "@/models/Category";
import { CategoryCollection } from "@/models/CategoryCollection";
import { deleteS3Object } from "./s3";
import { buildQueryFromRules } from "@/lib/content/query";

const CATEGORY_COLLECTION_LIST_PATH = "/catalog/categories/collections";
const MANUAL_ITEM_LIMIT = 50;

// ---------- Get all category collections ----------
export async function getAllCategoryCollections() {
  try {
    await connection();
    const collections = await CategoryCollection.find().sort({
      order: 1,
      createdAt: -1,
    });
    return { success: true, data: JSON.parse(JSON.stringify(collections)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Get collections with resolved categories (admin preview) ----------
export async function getCategoryCollectionsWithCategories() {
  try {
    await connection();
    const collections = await CategoryCollection.find({})
      .populate("items")
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const results = [];

    for (const collection of collections) {
      let matchingItems: any[] = [];

      if (collection.type === "rule") {
        const query = buildQueryFromRules(collection.rules, "Category");
        if (Object.keys(query).length > 0) {
          matchingItems = await (Category as any).find(query).limit(50).lean();
        }
      } else if (collection.type === "manual") {
        matchingItems = collection.items || [];
      } else if (collection.type === "recommendation") {
        // Recommendation collections are dynamic; nothing to pre-fetch here.
        matchingItems = [];
      } else if (collection.type === "related") {
        // Related collections require a category context, which the admin
        // list does not have.
        matchingItems = [];
      }

      results.push({
        collection: {
          _id: collection._id,
          name: collection.name,
          description: collection.description,
          imageUrl: collection.imageUrl,
          type: collection.type,
          targetType: "Category",
          rules: collection.rules,
          items: collection.items,
          status: collection.status,
          order: collection.order,
          showName: collection.showName,
          recommendationType: collection.recommendationType,
          recommendationLimit: collection.recommendationLimit,
          createdAt: (collection as any).createdAt,
          updatedAt: (collection as any).updatedAt,
        },
        items: matchingItems,
        itemCount: matchingItems.length,
        requiresCategoryContext: collection.type === "related",
      });
    }

    return { success: true, data: results };
  } catch (error) {
    console.error("Error fetching category collections with items:", error);
    return { success: false, error: "Failed to fetch category collections" };
  }
}

// ---------- Shared validation helpers ----------
function rejectNonCategoryTarget(formData: FormData) {
  const requested = formData.get("targetType");
  if (requested && requested !== "Category") {
    return {
      success: false as const,
      error: "Only Category collections are supported here.",
    };
  }
  return null;
}

function validateType(type: string) {
  if (!["rule", "manual", "recommendation", "related"].includes(type)) {
    return { success: false as const, error: "Invalid collection type" };
  }
  return null;
}

// ---------- Create category collection ----------
export async function createCategoryCollection(formData: FormData) {
  try {
    await connection();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const status = formData.get("status") as string;
    const type = (formData.get("type") as string) || "rule";
    const rulesJson = formData.get("rules") as string;
    const itemsJson = formData.get("items") as string;
    const order = parseInt(formData.get("order") as string) || 0;
    const showName = formData.get("showName") === "true";

    const recommendationType =
      (formData.get("recommendationType") as string) || "";
    const recommendationLimit =
      parseInt(formData.get("recommendationLimit") as string) || 10;

    if (!name?.trim()) {
      return { success: false, error: "Name is required" };
    }

    const invalidTarget = rejectNonCategoryTarget(formData);
    if (invalidTarget) return invalidTarget;

    const invalidType = validateType(type);
    if (invalidType) return invalidType;

    if (type === "recommendation") {
      if (
        !["trending", "personalized", "recentlyViewed"].includes(
          recommendationType,
        )
      ) {
        return { success: false, error: "Invalid recommendation type" };
      }
    }
    if (
      ["recommendation", "related"].includes(type) &&
      recommendationLimit < 1
    ) {
      return {
        success: false,
        error: "Collection item limit must be at least 1",
      };
    }

    let rules: any[] = [];
    let items: string[] = [];

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
        items = Array.from(new Set(items.map((i: any) => String(i))));
        if (items.length > MANUAL_ITEM_LIMIT) {
          return {
            success: false,
            error: `A manual collection can contain at most ${MANUAL_ITEM_LIMIT} items. Received ${items.length}.`,
          };
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

    const existing = await CategoryCollection.findOne({ name: name.trim() });
    if (existing) {
      return {
        success: false,
        error: "A category collection with this name already exists",
      };
    }

    const collection = new CategoryCollection({
      name: name.trim(),
      description: description?.trim() || "",
      imageUrl,
      status: status || "active",
      type,
      targetType: "Category",
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
    revalidatePath(CATEGORY_COLLECTION_LIST_PATH);
    return {
      success: true,
      data: collection.toObject(),
      message: "Category collection created successfully",
    };
  } catch (error: any) {
    console.error("Error creating category collection:", error);
    return { success: false, error: "Failed to create category collection" };
  }
}

// ---------- Update category collection ----------
export async function updateCategoryCollection(id: string, formData: FormData) {
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
    const rulesJson = formData.get("rules") as string;
    const itemsJson = formData.get("items") as string;
    const order = parseInt(formData.get("order") as string) || 0;
    const showName = formData.get("showName") === "true";

    const recommendationType =
      (formData.get("recommendationType") as string) || "";
    const recommendationLimit =
      parseInt(formData.get("recommendationLimit") as string) || 10;

    if (!name?.trim()) return { success: false, error: "Name is required" };

    const invalidTarget = rejectNonCategoryTarget(formData);
    if (invalidTarget) return invalidTarget;

    const invalidType = validateType(type);
    if (invalidType) return invalidType;

    if (type === "recommendation") {
      if (
        !["trending", "personalized", "recentlyViewed"].includes(
          recommendationType,
        )
      ) {
        return { success: false, error: "Invalid recommendation type" };
      }
    }
    if (
      ["recommendation", "related"].includes(type) &&
      recommendationLimit < 1
    ) {
      return {
        success: false,
        error: "Collection item limit must be at least 1",
      };
    }

    let rules: any[] = [];
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

    let items: string[] = [];
    if (type === "manual") {
      try {
        items = itemsJson ? JSON.parse(itemsJson) : [];
        if (!Array.isArray(items)) {
          return { success: false, error: "Items must be an array" };
        }
        items = Array.from(new Set(items.map((i: any) => String(i))));
        if (items.length > MANUAL_ITEM_LIMIT) {
          return {
            success: false,
            error: `A manual collection can contain at most ${MANUAL_ITEM_LIMIT} items. Received ${items.length}.`,
          };
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

    const existing = await CategoryCollection.findOne({
      name: name.trim(),
      _id: { $ne: new mongoose.Types.ObjectId(id) },
    });
    if (existing) {
      return {
        success: false,
        error: "Another category collection with this name already exists",
      };
    }

    const updates = {
      name: name.trim(),
      description: description?.trim() || "",
      imageUrl,
      status: status || "active",
      type,
      targetType: "Category",
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
      updatedAt: new Date(),
    };

    const collection = await CategoryCollection.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    if (!collection) {
      return { success: false, error: "Category collection not found" };
    }

    revalidatePath(CATEGORY_COLLECTION_LIST_PATH);
    return {
      success: true,
      data: collection,
      message: "Category collection updated successfully",
    };
  } catch (error: any) {
    console.error("Error updating category collection:", error);
    return { success: false, error: "Failed to update category collection" };
  }
}

// ---------- Get category collection by ID ----------
export async function getCategoryCollectionById(id: string) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }
    await connection();
    const collection = await CategoryCollection.findById(id)
      .populate("items")
      .lean();
    if (!collection) {
      return { success: false, error: "Category collection not found" };
    }
    return { success: true, data: collection };
  } catch (error) {
    console.error("Error fetching category collection:", error);
    return { success: false, error: "Failed to fetch category collection" };
  }
}

// ---------- Delete category collection ----------
export async function deleteCategoryCollection(id: string) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }
    await connection();
    const collection = await CategoryCollection.findByIdAndDelete(id);
    if (!collection) {
      return { success: false, error: "Category collection not found" };
    }
    revalidatePath(CATEGORY_COLLECTION_LIST_PATH);
    return {
      success: true,
      message: "Category collection deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting category collection:", error);
    return { success: false, error: "Failed to delete category collection" };
  }
}

// ---------- Delete image ----------
export async function deleteCategoryCollectionImage(collectionId: string) {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return { success: false, error: "Invalid collection ID" };
    }
    const collection = await CategoryCollection.findById(collectionId);
    if (!collection) {
      return { success: false, error: "Category collection not found" };
    }
    if (!collection.imageUrl) {
      return { success: false, error: "No image to delete" };
    }
    await deleteS3Object(collection.imageUrl);
    collection.imageUrl = "";
    await collection.save();
    revalidatePath(CATEGORY_COLLECTION_LIST_PATH);
    return { success: true };
  } catch (error) {
    console.error("Error deleting category collection image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}

// ---------- Fetch available categories for manual selection ----------
export async function fetchAvailableCategoryItems(
  search?: string,
  sortOrder: "asc" | "desc" = "asc",
) {
  try {
    await connection();

    const filter: any = {};
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const items = await Category.find(filter)
      .select("_id name imageUrl slug")
      .sort({ name: sortOrder === "asc" ? 1 : -1 })
      .limit(MANUAL_ITEM_LIMIT)
      .lean();

    const normalized = items.map((item: any) => ({
      _id: item._id.toString(),
      name: item.name,
      slug: item.slug,
      // Category stores imageUrl as string[] – use the first one for the preview.
      imageUrl:
        Array.isArray(item.imageUrl) && item.imageUrl.length > 0
          ? item.imageUrl[0]
          : null,
    }));

    return { success: true, data: normalized };
  } catch (error) {
    console.error("Error fetching available categories:", error);
    return { success: false, error: "Failed to fetch categories" };
  }
}
