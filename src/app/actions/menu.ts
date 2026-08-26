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
import { deleteS3Object } from "./s3";

// ------------------------------------------------------------
// Interface matching the new schema (including order)
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
  order?: number; // NEW: for sorting menus within a location
}

// ------------------------------------------------------------
// Helper: populate content recursively (supports nested MegaMenu)
// ------------------------------------------------------------
async function populateContent(menu: any) {
  if (!menu || !menu.content || menu.content.length === 0) return menu;

  const type = menu.type;
  let model: any;
  let isMenuModel = false;

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
    case "MegaMenu": // For MegaMenu, content are child Menu IDs
      model = Menu;
      isMenuModel = true;
      break;
    default:
      // For URL, Search, Page, we don't populate
      return menu;
  }

  const docs = await model.find({ _id: { $in: menu.content } }).lean();

  if (isMenuModel) {
    // Recursively populate each child menu
    const populatedChildren = await Promise.all(
      docs.map(async (doc: any) => {
        const childMenu = { ...doc };
        return populateContent(childMenu);
      }),
    );
    menu.populatedContent = populatedChildren.map((child) => ({
      _id: child._id.toString(),
      name: child.name,
      fullData: child, // store the fully populated child for recursive rendering
    }));
  } else {
    // For other types, just store the populated documents
    menu.populatedContent = docs.map((doc: any) => ({
      _id: doc._id.toString(),
      name: doc.name || doc.title || "Unnamed",
      image: doc.image || doc.imageUrl || null,
      // Add other fields if needed
    }));
  }

  return menu;
}

// ------------------------------------------------------------
// Get menus by location (sorted by order)
// ------------------------------------------------------------
export async function getMenusByLocation(location: string) {
  try {
    await connection();
    const menus = await Menu.find({ location }).sort({ order: 1 }); // ascending order
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

// ------------------------------------------------------------
// CRUD operations (updated to handle order)
// ------------------------------------------------------------
export async function getMenuById(id: string) {
  try {
    await connection();
    const menu = await Menu.findById(id);
    if (!menu) return { success: false, error: "Menu not found" };

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

    // Include order if provided, else default 0
    const newMenu = new Menu({
      ...menuData,
      content: contentIds,
      order: menuData.order ?? 0, // NEW: handle order
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

export async function updateMenu(id: string, menuData: Partial<MenuData>) {
  try {
    await connection();
    const updateData: any = { ...menuData };
    if (menuData.content) {
      updateData.content = menuData.content.map(
        (id) => new mongoose.Types.ObjectId(id),
      );
    }
    // order is included in spread, but we ensure it's set
    if (menuData.order !== undefined) {
      updateData.order = menuData.order;
    }

    const menu = await Menu.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!menu) return { success: false, error: "Menu not found" };

    revalidatePath("/marketing/content/navigation/menus");
    revalidatePath(`/marketing/content/navigation/menus/edit/${id}`);

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

    revalidatePath("/marketing/content/navigation/menus");
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

    revalidatePath("/marketing/content/navigation"); // adjust path

    return { success: true, message: "Background image removed successfully" };
  } catch (error) {
    console.error("Error deleting menu background image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}
