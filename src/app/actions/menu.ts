"use server";

import { connection } from "@/utils/connection";
import { Menu } from "@/models/Menu";
import { Collection } from "@/models/Collection";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Promotion from "@/models/Promotion";
import Page from "@/models/Page"; // if you have a Page model
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { deleteS3Object } from "./s3";

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

// ---------- Resolve items from a collection ----------
async function resolveCollectionItems(collectionId: string) {
  const collection: any = await Collection.findById(collectionId).lean();
  if (!collection) return [];

  if (collection.type === "rule") {
    const Model = getModelForTargetType(collection.targetType);
    if (!Model) return [];
    const query = buildQueryFromRules(collection.rules, collection.targetType);
    if (Object.keys(query).length === 0) return [];
    const items = await (Model as mongoose.Model<any>)
      .find(query)
      .limit(50)
      .lean();
    return items;
  } else {
    // manual – items are stored as ObjectIds, we need to populate them
    const Model = getModelForTargetType(collection.targetType);
    if (!Model) return [];
    const items = await (Model as mongoose.Model<any>)
      .find({
        _id: { $in: collection.items },
      })
      .lean();
    return items;
  }
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
          items, // attached for rendering
        };
      }),
    );
    return { success: true, data: JSON.parse(JSON.stringify(enriched)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Get single menu by ID ----------
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
// ---------- Get all menus (without items, for listing) ----------
export async function getAllMenus() {
  try {
    await connection();
    const menus = await Menu.find()
      .populate("collectionId", "name") // Populate collection name
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, data: JSON.parse(JSON.stringify(menus)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------- Create a new menu ----------
export async function createMenu(menuData: any) {
  try {
    await connection();
    const newMenu = new Menu({
      name: menuData.name,
      description: menuData.description,
      image: menuData.image,
      collectionId: menuData.collectionId || undefined,
      link: menuData.link || undefined,
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

// ---------- Update an existing menu ----------
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

// ---------- Delete background image from a menu ----------
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
