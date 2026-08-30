"use server";

import { connection } from "@/utils/connection";
import { Menu } from "@/models/Menu";
import { Collection } from "@/models/Collection";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Promotion from "@/models/Promotion";
import Page from "@/models/Page";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { deleteS3Object } from "./s3";
import {
  getTrendingItems,
  getRecommendations,
  getRecentlyViewed,
} from "./events";

// ---------- Helper: get model by target type ----------
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

// ---------- Parse rule value (same as collection.ts) ----------
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

// ---------- Resolve items from a collection (returns normalized items) ----------
async function resolveCollectionItems(collectionId: string) {
  const collection: any = await Collection.findById(collectionId).lean();
  if (!collection) return [];

  let rawItems: any[] = [];

  // ---------- RECOMMENDATION TYPE ----------
  if (collection.type === "recommendation") {
    const limit = collection.recommendationLimit || 10;
    switch (collection.recommendationType) {
      case "trending":
        rawItems = await getTrendingItems(limit);
        break;
      case "personalized":
        rawItems = await getRecommendations(limit);
        break;
      case "recentlyViewed":
        rawItems = await getRecentlyViewed(limit);
        break;
      default:
        rawItems = [];
    }
    // Normalise – all recommendation functions return Product documents
    return rawItems.map((item: any) => ({
      _id: item._id.toString(),
      name: item.title || item.name || "Unnamed",
      image: item.main_image || item.image || item.imageUrl || null,
      contentType: "Product",
    }));
  }

  // ---------- RULE & MANUAL ----------
  const targetType = collection.targetType;
  const Model = getModelForTargetType(targetType);
  if (!Model) return [];

  if (collection.type === "rule") {
    const query = buildQueryFromRules(collection.rules, targetType);
    if (Object.keys(query).length === 0) return [];
    rawItems = await (Model as mongoose.Model<any>)
      .find(query)
      .limit(50)
      .lean();
  } else {
    // manual
    rawItems = await (Model as mongoose.Model<any>)
      .find({ _id: { $in: collection.items } })
      .lean();
  }

  // Normalise items consistently
  return rawItems.map((item: any) => {
    const name = item.name || item.title || "Unnamed";
    let image: string | null = null;

    if (targetType === "Product") {
      image = item.main_image || item.image || item.imageUrl || null;
    } else if (targetType === "Collection") {
      image = item.imageUrl || item.image || null;
    } else {
      // Category, Brand, Promotion, Page
      image = item.image || item.imageUrl || item.backgroundImage || null;
    }

    return {
      _id: item._id.toString(),
      name,
      image,
      contentType: targetType,
    };
  });
}

// ---------- Get menus by location (with items) ----------
export async function getMenusByLocation(location: string) {
  try {
    await connection();
    const menus = await Menu.find({ location }).sort({ order: 1 }).lean();
    const enriched = await Promise.all(
      menus.map(async (menu) => {
        let items: any[] = [];
        if (menu.collectionId) {
          items = await resolveCollectionItems(menu.collectionId.toString());
        }
        return {
          ...menu,
          items,
        };
      }),
    );
    return { success: true, data: JSON.parse(JSON.stringify(enriched)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Get single menu by ID (with items) ----------
export async function getMenuById(id: string) {
  try {
    await connection();
    const menu = await Menu.findById(id).lean();
    if (!menu) return { success: false, error: "Menu not found" };

    let items: any[] = [];
    if (menu.collectionId) {
      items = await resolveCollectionItems(menu.collectionId.toString());
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify({ ...menu, items })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Get all menus (without items, for listing) ----------
export async function getAllMenus() {
  try {
    await connection();
    const menus = await Menu.find()
      .populate("collectionId", "name") // show collection name in admin list
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, data: JSON.parse(JSON.stringify(menus)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Create a new menu (admin) ----------
export async function createMenu(menuData: any) {
  try {
    await connection();
    const newMenu = new Menu({
      name: menuData.name,
      description: menuData.description,
      image: menuData.image,
      collectionId: menuData.collectionId || undefined,
      link: menuData.link || undefined,
      ctaText: menuData.ctaText || undefined,
      ctaLink: menuData.ctaLink || undefined,
      location: menuData.location,
      display: menuData.display,
      position: menuData.position,
      columns: menuData.columns,
      maxDepth: menuData.maxDepth,
      showImages: menuData.showImages,
      backgroundColor: menuData.backgroundColor,
      backgroundImage: menuData.backgroundImage,
      isSticky: menuData.isSticky,
      sectionTitle: menuData.sectionTitle,
      order: menuData.order ?? 0,
    });
    await newMenu.save();
    revalidatePath("/marketing/content/navigation/menus");
    return {
      success: true,
      data: JSON.parse(JSON.stringify(newMenu)),
      message: "Menu created successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Update an existing menu (admin) ----------
export async function updateMenu(id: string, menuData: any) {
  try {
    await connection();
    const updated = await Menu.findByIdAndUpdate(
      id,
      {
        $set: {
          name: menuData.name,
          description: menuData.description,
          image: menuData.image,
          collectionId: menuData.collectionId || undefined,
          link: menuData.link || undefined,
          ctaText: menuData.ctaText || undefined,
          ctaLink: menuData.ctaLink || undefined,
          location: menuData.location,
          display: menuData.display,
          position: menuData.position,
          columns: menuData.columns,
          maxDepth: menuData.maxDepth,
          showImages: menuData.showImages,
          backgroundColor: menuData.backgroundColor,
          backgroundImage: menuData.backgroundImage,
          isSticky: menuData.isSticky,
          sectionTitle: menuData.sectionTitle,
          order: menuData.order ?? 0,
        },
      },
      { new: true, runValidators: true },
    );
    if (!updated) return { success: false, error: "Menu not found" };
    revalidatePath("/marketing/content/navigation/menus");
    revalidatePath(`/marketing/content/navigation/menus/edit/${id}`);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(updated)),
      message: "Menu updated successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Delete a menu ----------
export async function deleteMenu(id: string) {
  try {
    await connection();
    const menu = await Menu.findByIdAndDelete(id);
    if (!menu) return { success: false, error: "Menu not found" };
    revalidatePath("/marketing/content/navigation/menus");
    return { success: true, message: "Menu deleted successfully" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Delete background image from a menu (admin) ----------
export async function deleteMenuBackgroundImage(menuId: string) {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return { success: false, error: "Invalid menu ID" };
    }
    const menu = await Menu.findById(menuId);
    if (!menu) {
      return { success: false, error: "Menu not found" };
    }
    if (!menu.backgroundImage) {
      return { success: false, error: "No background image to delete" };
    }
    await deleteS3Object(menu.backgroundImage);
    menu.backgroundImage = "";
    await menu.save();
    revalidatePath("/marketing/content/navigation/menus");
    return { success: true, message: "Background image removed successfully" };
  } catch (error) {
    console.error("Error deleting menu background image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}
