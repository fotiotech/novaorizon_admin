// app/actions/menu.ts
"use server";

import { connection } from "@/utils/connection";
import { Menu } from "@/models/Menu";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Promotion from "@/models/Promotion";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { Collection } from "@/models/Collection";

// ------------------------------------------------------------
// Interface matching the new schema
// ------------------------------------------------------------
export interface MenuData {
  name: string;
  description?: string;
  content: string[]; // array of ObjectId strings
  ctaUrl?: string;
  ctaText?: string;
  type: string; // "Category" | "Product" | ...
  location?: string;
  display?: string;
  position?: string;
  columns?: number;
  maxDepth?: number;
  showImages?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  isSticky?: boolean;
  sectionTitle?: string;
}

// ------------------------------------------------------------
// Helper: populate content based on menu type
// ------------------------------------------------------------
async function populateContent(menu: any) {
  if (!menu || !menu.content || menu.content.length === 0) return menu;

  const type = menu.type;
  let model: any;
  switch (type) {
    case "Category":
      model = Category;
      break;
    case "Product":
      model = Product;
      break;
    case "Brand":
      model = Brand;
      break;
    case "Promotion":
      model = Promotion;
      break;
    case "Collection":
      model = Collection;
      break;
    default:
      // For URL, Search, Page, Home we don't populate (content may be empty)
      return menu;
  }

  // Fetch the referenced documents
  const populated = await model.find({ _id: { $in: menu.content } }).lean();
  // Attach as a virtual property or replace content with populated objects
  // We'll keep the original content IDs and add a `populatedContent` field for convenience
  menu.populatedContent = populated.map((doc: any) => ({
    _id: doc._id.toString(),
    name: doc.name || doc.title || "Unnamed",
    // add other fields if needed
  }));
  return menu;
}

// ------------------------------------------------------------
// CRUD operations
// ------------------------------------------------------------
export async function getMenuById(id: string) {
  try {
    await connection();
    const menu = await Menu.findById(id);
    if (!menu) return { success: false, error: "Menu not found" };

    // Populate content based on type
    const populatedMenu = await populateContent(menu.toObject());

    return {
      success: true,
      data: JSON.parse(JSON.stringify(populatedMenu)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllMenus() {
  try {
    await connection();
    const menus = await Menu.find().sort({ createdAt: -1 });
    const populatedMenus = await Promise.all(
      menus.map(async (menu) => populateContent(menu.toObject())),
    );
    return {
      success: true,
      data: JSON.parse(JSON.stringify(populatedMenus)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMenusByType(type: string) {
  try {
    await connection();
    const menus = await Menu.find({ type }).sort({ createdAt: -1 });
    const populatedMenus = await Promise.all(
      menus.map(async (menu) => populateContent(menu.toObject())),
    );
    return {
      success: true,
      data: JSON.parse(JSON.stringify(populatedMenus)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMenu(menuData: MenuData) {
  try {
    await connection();
    // Convert content strings to ObjectIds
    const contentIds = (menuData.content || []).map(
      (id) => new mongoose.Types.ObjectId(id),
    );
    const newMenu = new Menu({
      ...menuData,
      content: contentIds,
    });
    await newMenu.save();

    revalidatePath("/content-management/app/navigation/menus");
    return {
      success: true,
      data: JSON.parse(JSON.stringify(newMenu)),
      message: "Menu created successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMenu(id: string, menuData: Partial<MenuData>) {
  try {
    await connection();
    const updateData: any = { ...menuData };
    if (menuData.content) {
      updateData.content = menuData.content.map(
        (id) => new mongoose.Types.ObjectId(id),
      );
    }

    const menu = await Menu.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!menu) return { success: false, error: "Menu not found" };

    revalidatePath("/content-management/app/navigation/menus");
    revalidatePath(`/content-management/app/navigation/menus/edit/${id}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(menu)),
      message: "Menu updated successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMenu(id: string) {
  try {
    await connection();
    const menu = await Menu.findByIdAndDelete(id);
    if (!menu) return { success: false, error: "Menu not found" };

    revalidatePath("/content-management/app/navigation/menus");
    return { success: true, message: "Menu deleted successfully" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------
// Fetch content options for form selection
// ------------------------------------------------------------
export async function getMenuContentOptions(type: string) {
  await connection();

  let items: any[] = [];
  switch (type) {
    case "Category":
      items = await Category.find().select("_id name").lean();
      break;
    case "Product":
      items = await Product.find().select("_id title").lean();
      break;
    case "Brand":
      items = await Brand.find().select("_id name").lean();
      break;
    case "Promotion":
      items = await Promotion.find().select("_id name").lean();
      break;
    case "Collection":
      items = await Collection.find().select("_id name").lean();
      break;
    default:
      // For Home, URL, Search, Page – no content options
      return [];
  }

  return items.map((item) => ({
    value: item._id.toString(),
    label: item.name || item.title || "Unnamed",
  }));
}
