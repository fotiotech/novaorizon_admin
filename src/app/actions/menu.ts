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
  getRelatedProducts,
} from "./events";

const MENUS_LIST_PATH = "/marketing/content/navigation/menus";

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

    // RuleEditor exposes the Product category field as `categoryId`.
    if (targetType === "Product" && rule.attribute === "categoryId") {
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

// ---------- Normalize a raw Product doc to menu item shape ----------
function normalizeProductItem(item: any) {
  return {
    _id: item._id.toString(),
    name: item.name || item.title || "Unnamed",
    image: Array.isArray(item.images)
      ? item.images[0] || null
      : item.mainImage || item.image || item.imageUrl || null,
    price: item.price ?? item.salePrice ?? item.sale_price ?? null,
    listPrice: item.listPrice ?? null,
    contentType: "Product",
  };
}

// ---------- Resolve items from a collection (returns normalized items) ----------
async function resolveCollectionItems(
  collectionId: string,
  context?: { productId?: string },
) {
  const collection: any = await Collection.findById(collectionId).lean();
  if (!collection) return [];

  let rawItems: any[] = [];

  // ---------- RECOMMENDATION ----------
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
    return rawItems.map(normalizeProductItem);
  }

  // ---------- RELATED ----------
  if (collection.type === "related") {
    if (!context?.productId) return [];
    const limit = collection.recommendationLimit || 10;
    rawItems = await getRelatedProducts(context.productId, limit);
    return rawItems.map(normalizeProductItem);
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
    rawItems = await (Model as mongoose.Model<any>)
      .find({ _id: { $in: collection.items } })
      .lean();
  }

  return rawItems.map((item: any) => {
    if (targetType === "Product") return normalizeProductItem(item);

    const name = item.name || item.title || "Unnamed";
    let image: string | null = null;

    if (targetType === "Collection") {
      image = item.imageUrl || item.image || null;
    } else {
      image = item.image || item.imageUrl || item.backgroundImage || null;
    }

    return {
      _id: item._id.toString(),
      name,
      image,
      price: null,
      listPrice: null,
      contentType: targetType,
    };
  });
}

// ---------- Revalidate the paths that render menus ----------
// Adjust the list if you render menus on more routes.
function revalidateMenuConsumers() {
  revalidatePath(MENUS_LIST_PATH);
  revalidatePath("/", "layout"); // any page that renders a MenuRenderer
}

// ---------- Get menus by location (with items) ----------
export async function getMenusByLocation(location: string, context?: any) {
  try {
    await connection();
    const menus = await Menu.find({ location })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    const enriched = await Promise.all(
      menus.map(async (menu) => {
        let items: any[] = [];
        if (menu.collectionId) {
          items = await resolveCollectionItems(
            menu.collectionId.toString(),
            context,
          );
        }
        return { ...menu, items };
      }),
    );
    return { success: true, data: JSON.parse(JSON.stringify(enriched)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Get single menu by ID (raw, for the admin edit form) ----------
export async function getMenuById(id: string, context?: any) {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid menu ID" };
    }
    const menu = await Menu.findById(id).lean();
    if (!menu) return { success: false, error: "Menu not found" };

    // For the admin edit screen we return the raw menu (no resolved items).
    // If a caller explicitly passes `context`, they want the resolved list too
    // (used by any preview surface that reuses this action).
    let items: any[] | undefined;
    if (context && menu.collectionId) {
      items = await resolveCollectionItems(
        menu.collectionId.toString(),
        context,
      );
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(items ? { ...menu, items } : menu)),
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
      .populate({ path: "collectionId", select: "name" })
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, data: JSON.parse(JSON.stringify(menus)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const DISPLAY_TYPES = ["List", "Grid", "Carousel", "Dropdown", "MegaMenu"];
const POSITIONS = ["left", "center", "right", "full"];
const LOCATIONS = [
  "Banner",
  "NavBar",
  "SideBar",
  "Home",
  "Section",
  "Footer",
  "ProductRelated", // was "product_related" in the old form
];

function validateMenuData(menuData: any): string | null {
  if (!menuData?.name?.trim()) return "Name is required";
  if (!menuData?.location) return "Location is required";
  if (!LOCATIONS.includes(menuData.location)) {
    return `Invalid location: ${menuData.location}`;
  }
  if (!DISPLAY_TYPES.includes(menuData.display)) {
    return `Invalid display type: ${menuData.display}`;
  }
  if (menuData.position && !POSITIONS.includes(menuData.position)) {
    return `Invalid position: ${menuData.position}`;
  }
  if (
    menuData.collectionId &&
    !mongoose.Types.ObjectId.isValid(menuData.collectionId)
  ) {
    return "Invalid collectionId";
  }
  if (menuData.columns != null) {
    const n = Number(menuData.columns);
    if (!Number.isInteger(n) || n < 1 || n > 6) return "columns must be 1–6";
  }
  if (menuData.maxDepth != null) {
    const n = Number(menuData.maxDepth);
    if (!Number.isInteger(n) || n < 0 || n > 10) return "maxDepth must be 0–10";
  }
  return null;
}

// ---------- Build the updates object, omitting undefined values ----------
// Prevents `$set: { field: undefined }` from silently unsetting fields the
// admin UI didn't send.
function buildMenuUpdates(menuData: any) {
  const updates: Record<string, any> = {
    name: menuData.name,
    location: menuData.location,
    display: menuData.display,
  };

  const passthrough = [
    "description",
    "image",
    "collectionId",
    "link",
    "ctaText",
    "ctaLink",
    "position",
    "columns",
    "maxDepth",
    "showImages",
    "backgroundColor",
    "backgroundImage",
    "isSticky",
    "sectionTitle",
  ];

  for (const key of passthrough) {
    if (menuData[key] !== undefined) {
      updates[key] = menuData[key] === "" ? null : menuData[key];
    }
  }

  updates.order = menuData.order ?? 0;
  return updates;
}

// ---------- Create a new menu (admin) ----------
export async function createMenu(menuData: any) {
  try {
    await connection();

    const validationError = validateMenuData(menuData);
    if (validationError) return { success: false, error: validationError };

    // Duplicate name check
    const existing = await Menu.findOne({ name: menuData.name.trim() });
    if (existing) {
      return {
        success: false,
        error: "A menu with this name already exists",
      };
    }

    const newMenu = new Menu(buildMenuUpdates(menuData));
    await newMenu.save();

    revalidateMenuConsumers();
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid menu ID" };
    }

    const validationError = validateMenuData(menuData);
    if (validationError) return { success: false, error: validationError };

    const current = await Menu.findById(id);
    if (!current) return { success: false, error: "Menu not found" };

    // Duplicate name check excluding self
    const dup = await Menu.findOne({
      _id: { $ne: current._id },
      name: menuData.name.trim(),
    });
    if (dup) {
      return {
        success: false,
        error: "Another menu with this name already exists",
      };
    }

    // Detect replaced images so we can clean up S3 after a successful save.
    const oldImage = current.image;
    const oldBackground = current.backgroundImage;

    const updates = buildMenuUpdates(menuData);
    Object.assign(current, updates);
    await current.save();

    if (oldImage && oldImage !== current.image) {
      try {
        await deleteS3Object(oldImage);
      } catch (err) {
        console.error("Failed to delete old menu image:", err);
      }
    }
    if (oldBackground && oldBackground !== current.backgroundImage) {
      try {
        await deleteS3Object(oldBackground);
      } catch (err) {
        console.error("Failed to delete old menu background image:", err);
      }
    }

    revalidateMenuConsumers();
    revalidatePath(`${MENUS_LIST_PATH}/edit/${id}`);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(current)),
      message: "Menu updated successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Delete a menu (admin) ----------
export async function deleteMenu(id: string) {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid menu ID" };
    }

    // Find first so we can clean up S3 assets.
    const menu = await Menu.findById(id);
    if (!menu) return { success: false, error: "Menu not found" };

    // Delete S3 assets BEFORE deleting the document, so we don't orphan them.
    for (const key of [menu.image, menu.backgroundImage]) {
      if (key) {
        try {
          await deleteS3Object(key);
        } catch (err) {
          console.error("Failed to delete menu S3 asset:", key, err);
        }
      }
    }

    await Menu.findByIdAndDelete(id);

    revalidateMenuConsumers();
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
    if (!menu) return { success: false, error: "Menu not found" };
    if (!menu.backgroundImage) {
      return { success: false, error: "No background image to delete" };
    }
    await deleteS3Object(menu.backgroundImage);
    menu.backgroundImage = "";
    await menu.save();
    revalidateMenuConsumers();
    return { success: true, message: "Background image removed successfully" };
  } catch (error) {
    console.error("Error deleting menu background image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}

// ---------- Delete main image from a menu (admin) ----------
export async function deleteMenuImage(menuId: string) {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return { success: false, error: "Invalid menu ID" };
    }
    const menu = await Menu.findById(menuId);
    if (!menu) return { success: false, error: "Menu not found" };
    if (!menu.image) {
      return { success: false, error: "No image to delete" };
    }
    await deleteS3Object(menu.image);
    menu.image = "";
    await menu.save();
    revalidateMenuConsumers();
    return { success: true, message: "Image removed successfully" };
  } catch (error) {
    console.error("Error deleting menu image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}
