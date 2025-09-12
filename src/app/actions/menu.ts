// app/actions/menu.ts
"use server";

import { connection } from "@/utils/connection";
import { Menu } from "@/models/Menu";
import { revalidatePath } from "next/cache";

// Define the Menu interface
export interface MenuData {
  name: string;
  description?: string;
  collections: string[];
  ctaUrl?: string;
  ctaText?: string;
}



// Get menu by ID
export async function getMenuById(id: string) {
  try {
    await connection();
    const menu = await Menu.findById(id).populate("collections");

    if (!menu) {
      return { success: false, error: "Menu not found" };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(menu)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get all menus
export async function getAllMenus() {
  try {
    await connection();
    const menus = await Menu.find()
      .populate("collections")
      .sort({ createdAt: -1 });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(menus)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Create a new menu
export async function createMenu(menuData: MenuData) {
  try {
    await connection();
    const menu = new Menu(menuData);
    await menu.save();

    revalidatePath("/content_merchandising/menus");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(menu)),
      message: "Menu created successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Update a menu
export async function updateMenu(id: string, menuData: Partial<MenuData>) {
  try {
    await connection();
    const menu = await Menu.findByIdAndUpdate(id, menuData, {
      new: true,
      runValidators: true,
    }).populate("collections");

    if (!menu) {
      return { success: false, error: "Menu not found" };
    }

    revalidatePath("content_merchandising/menus");
    revalidatePath(`/content_merchandising/menus?id=${id}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(menu)),
      message: "Menu updated successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Delete a menu
export async function deleteMenu(id: string) {
  try {
    await connection();
    const menu = await Menu.findByIdAndDelete(id);

    if (!menu) {
      return { success: false, error: "Menu not found" };
    }

    revalidatePath("/content_merchandising/menus");

    return {
      success: true,
      message: "Menu deleted successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
