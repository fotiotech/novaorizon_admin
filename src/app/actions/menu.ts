// app/actions/menu.ts
"use server";

import { connection } from "@/utils/connection";
import {
  Menu,
  DEFAULT_DISPLAY_CONFIG,
  MENU_THEMES,
  MAX_FEATURED_SLOTS,
  SURFACE_LOCATIONS,
  type IMenuItem,
} from "@/models/Menu";
import {
  MENU_LOCATIONS,
  MENU_DISPLAY_TYPES,
  SUBMENU_DISPLAY_TYPES,
  ALIGNMENTS,
  POSITIONS,
  ANIMATIONS,
  COLUMN_COUNTS,
  LINK_TYPES,
  REF_MODELS,
  REF_TYPES,
  MAX_DEPTH,
  REF_MODEL_BY_TYPE,
} from "@/lib/menu/constants";
import { supportsMenuFeature } from "@/lib/menu/capabilities";
import { Collection } from "@/models/Collection";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { revalidatePath, revalidateTag } from "next/cache";
import mongoose from "mongoose";
import { deleteS3Object } from "./s3";

const MENUS_LIST_PATH = "/marketing/content/navigation/menus";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

export interface RefOption {
  id: string;
  name: string;
}

export type MenuRefOptions = Record<
  "Category" | "Product" | "Collection",
  RefOption[]
>;

export type EnrichedMenuItem = IMenuItem & { slug: string | null };

/* -------------------------------------------------------------------------- */
/*                              Revalidation                                  */
/* -------------------------------------------------------------------------- */

function revalidateMenuConsumers() {
  revalidatePath(MENUS_LIST_PATH);
  revalidateTag("header-nav", "max");
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------------- */
/*                              Reference fetch map                           */
/* -------------------------------------------------------------------------- */

const REF_FETCHERS: Record<string, { find: Function }> = {
  Category,
  Product,
  Collection,
};

/* -------------------------------------------------------------------------- */
/*                              Reference options                             */
/* -------------------------------------------------------------------------- */

export async function getMenuRefOptions(): Promise<
  ActionResult<MenuRefOptions>
> {
  try {
    await connection();

    const entries = await Promise.all(
      (
        Object.entries(REF_FETCHERS) as [
          keyof MenuRefOptions,
          { find: Function },
        ][]
      ).map(async ([key, model]) => {
        const docs = await model
          .find({}, { name: 1 })
          .sort({ name: 1 })
          .limit(500)
          .lean();
        const options: RefOption[] = docs.map((d: any) => ({
          id: String(d._id),
          name: d.name ?? "Untitled",
        }));
        return [key, options] as const;
      }),
    );

    return {
      success: true,
      data: Object.fromEntries(entries) as MenuRefOptions,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                              Slug enrichment                               */
/* -------------------------------------------------------------------------- */

function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickSlug(doc: any): string {
  if (!doc) return "";
  if (doc.slug) return String(doc.slug);
  if (doc.url_slug) return String(doc.url_slug);
  if (doc.handle) return String(doc.handle);
  if (doc.name) return slugify(doc.name);
  return "";
}

async function enrichItemsWithSlugs(
  items: IMenuItem[],
): Promise<EnrichedMenuItem[]> {
  if (!items?.length) return [];

  const idsByModel: Record<string, Set<string>> = {};
  const collect = (list: IMenuItem[]) => {
    for (const item of list) {
      if (item.refModel && item.refId) {
        const bucket = (idsByModel[item.refModel] ??= new Set());
        bucket.add(String(item.refId));
      }
      if (item.children?.length) collect(item.children);
    }
  };
  collect(items);

  const slugById: Record<string, Record<string, string>> = {};

  await Promise.all(
    Object.entries(idsByModel).map(async ([modelName, ids]) => {
      const fetcher = REF_FETCHERS[modelName];
      if (!fetcher) return;

      const docs = await fetcher
        .find(
          { _id: { $in: Array.from(ids) } },
          { name: 1, slug: 1, url_slug: 1, handle: 1 },
        )
        .lean();

      const map: Record<string, string> = {};
      for (const doc of docs) {
        map[String(doc._id)] = pickSlug(doc);
      }
      slugById[modelName] = map;
    }),
  );

  const stamp = (list: IMenuItem[]): EnrichedMenuItem[] =>
    list.map((item) => {
      const slug =
        item.refModel && item.refId
          ? (slugById[item.refModel]?.[String(item.refId)] ?? null)
          : null;

      return {
        ...item,
        slug,
        children: stamp(item.children ?? []) as any,
      } as EnrichedMenuItem;
    });

  return stamp(items);
}

/* -------------------------------------------------------------------------- */
/*                                Read actions                                */
/* -------------------------------------------------------------------------- */

export async function getMenusByLocation(
  location: string,
): Promise<ActionResult<any[]>> {
  try {
    await connection();
    const menus = await Menu.find({ location, visible: { $ne: false } })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      menus.map(async (menu) => ({
        ...menu,
        items: await enrichItemsWithSlugs(menu.items ?? []),
      })),
    );

    return { success: true, data: JSON.parse(JSON.stringify(enriched)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMenuById(id: string): Promise<ActionResult<any>> {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid menu ID" };
    }
    const menu = await Menu.findById(id).lean();
    if (!menu) return { success: false, error: "Menu not found" };
    return { success: true, data: JSON.parse(JSON.stringify(menu)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllMenus(): Promise<ActionResult<any[]>> {
  try {
    await connection();
    const menus = await Menu.find().sort({ createdAt: -1 }).lean();
    return { success: true, data: JSON.parse(JSON.stringify(menus)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Validation                                 */
/* -------------------------------------------------------------------------- */

const BOOLEAN_FIELDS = ["showImages", "isSticky", "visible"] as const;
const NUMBER_FIELDS = ["order", "columns", "maxDepth"] as const;

function validateDisplayConfig(dc: any): string | null {
  if (!dc) return null;
  if (dc.alignment && !ALIGNMENTS.includes(dc.alignment)) {
    return `Invalid alignment: ${dc.alignment}`;
  }
  if (dc.animation && !ANIMATIONS.includes(dc.animation)) {
    return `Invalid animation: ${dc.animation}`;
  }
  if (dc.theme && !MENU_THEMES.includes(dc.theme)) {
    return `Invalid theme: ${dc.theme}`;
  }
  if (dc.gap != null) {
    const n = Number(dc.gap);
    if (isNaN(n) || n < 0 || n > 64) return "gap must be 0–64";
  }
  if (dc.megaWidth != null && typeof dc.megaWidth === "string") {
    const ok =
      dc.megaWidth === "" ||
      dc.megaWidth === "container" ||
      /^\d+(\.\d+)?(px|rem|em|vw|%)$/.test(dc.megaWidth);
    if (!ok) return "megaWidth must be a CSS length or 'container'";
  }
  return null;
}

function validateTree(items: any[], depth = 1, cap = MAX_DEPTH): string | null {
  if (!Array.isArray(items)) return "items must be an array";
  if (depth > cap) return `Menu items exceed max depth of ${cap}`;

  for (const item of items) {
    if (!item.label?.trim()) return "Every menu item needs a label";
    if (!LINK_TYPES.includes(item.type))
      return `Invalid link type: ${item.type}`;

    const needsRef = (REF_TYPES as readonly string[]).includes(item.type);
    if (needsRef) {
      if (!item.refId) return `"${item.label}" needs a ${item.type} reference`;
      if (!mongoose.Types.ObjectId.isValid(item.refId)) {
        return `"${item.label}" has an invalid refId`;
      }
      if (item.refModel && !REF_MODELS.includes(item.refModel)) {
        return `"${item.label}" has an invalid refModel`;
      }
    } else if (!item.url?.trim()) {
      return `"${item.label}" needs a URL`;
    }

    if (
      item.submenuDisplay &&
      !SUBMENU_DISPLAY_TYPES.includes(item.submenuDisplay)
    ) {
      return `Invalid submenuDisplay on "${item.label}"`;
    }
    if (
      item.columns != null &&
      !COLUMN_COUNTS.includes(Number(item.columns) as any)
    ) {
      return `Invalid columns on "${item.label}"`;
    }
    if (item.submenuPosition && !POSITIONS.includes(item.submenuPosition)) {
      return `Invalid submenuPosition on "${item.label}"`;
    }
    if (item.align && !ALIGNMENTS.includes(item.align)) {
      return `Invalid align on "${item.label}"`;
    }

    if (Array.isArray(item.children) && item.children.length) {
      const nested = validateTree(item.children, depth + 1, cap);
      if (nested) return nested;
    }
  }
  return null;
}

function validateMenuData(menuData: any): string | null {
  if (!menuData?.name?.trim()) return "Name is required";
  if (!menuData?.location) return "Location is required";
  if (!MENU_LOCATIONS.includes(menuData.location)) {
    return `Invalid location: ${menuData.location}`;
  }
  if (!MENU_DISPLAY_TYPES.includes(menuData.display)) {
    return `Invalid display: ${menuData.display}`;
  }

  if (
    menuData.columns != null &&
    !COLUMN_COUNTS.includes(Number(menuData.columns) as any)
  ) {
    return "Invalid columns";
  }

  const cap = Math.min(menuData.maxDepth ?? MAX_DEPTH, MAX_DEPTH);
  if (menuData.maxDepth != null) {
    const n = Number(menuData.maxDepth);
    if (!Number.isInteger(n) || n < 1 || n > MAX_DEPTH) {
      return `maxDepth must be 1–${MAX_DEPTH}`;
    }
  }

  const treeErr = validateTree(menuData.items ?? [], 1, cap);
  if (treeErr) return treeErr;

  const dcErr = validateDisplayConfig(menuData.displayConfig);
  if (dcErr) return dcErr;

  return null;
}

/* -------------------------------------------------------------------------- */
/*                              Update builder                                */
/* -------------------------------------------------------------------------- */

const PASSTHROUGH_FIELDS = [
  "description",
  "image",
  "backgroundColor",
  "backgroundImage",
] as const;

function sanitizeTree(items: any[]): any[] {
  return items.map((raw) => {
    const isRef = (REF_TYPES as readonly string[]).includes(raw.type);
    return {
      _id:
        raw._id && mongoose.Types.ObjectId.isValid(raw._id)
          ? raw._id
          : undefined,
      label: raw.label?.trim() ?? "",
      type: raw.type,
      refId: isRef ? raw.refId || null : null,
      refModel: isRef ? (REF_MODEL_BY_TYPE[raw.type] ?? null) : null,
      url: isRef ? "" : (raw.url ?? ""),
      icon: raw.icon || null,
      badge: raw.badge || null,
      openInNewTab: !!raw.openInNewTab,
      isVisible: raw.isVisible !== false,
      submenuDisplay: raw.submenuDisplay || null,
      columns: raw.columns ?? 3,
      submenuPosition: raw.submenuPosition ?? "bottom-start",
      align: raw.align ?? "start",
      featured: raw.featured
        ? {
            image: raw.featured.image || "",
            title: raw.featured.title || "",
            href: raw.featured.href || "",
            ctaText: raw.featured.ctaText || "",
            badge: raw.featured.badge || "",
          }
        : null,
      children: Array.isArray(raw.children) ? sanitizeTree(raw.children) : [],
    };
  });
}

function buildMenuUpdates(menuData: any) {
  const location = menuData.location as string;

  const updates: Record<string, any> = {
    name: menuData.name,
    location,
    display: menuData.display,
    items: sanitizeTree(menuData.items ?? []),
  };

  for (const key of PASSTHROUGH_FIELDS) {
    if (menuData[key] === undefined) continue;

    // Strip fields the location doesn't support so a menu moved between
    // locations doesn't carry stale values the renderer will ignore.
    if (
      key === "backgroundColor" &&
      !supportsMenuFeature(location, "background")
    ) {
      updates[key] = "#ffffff";
      continue;
    }
    if (
      key === "backgroundImage" &&
      !supportsMenuFeature(location, "background")
    ) {
      updates[key] = null;
      continue;
    }
    if (key === "image" && !supportsMenuFeature(location, "mainImage")) {
      updates[key] = null;
      continue;
    }

    updates[key] = menuData[key] === "" ? null : menuData[key];
  }

  for (const key of BOOLEAN_FIELDS) {
    if (menuData[key] !== undefined) updates[key] = !!menuData[key];
  }
  for (const key of NUMBER_FIELDS) {
    if (menuData[key] !== undefined && menuData[key] !== null) {
      const n = Number(menuData[key]);
      if (!isNaN(n)) updates[key] = n;
    }
  }

  if (menuData.displayConfig !== undefined) {
    updates.displayConfig = {
      ...DEFAULT_DISPLAY_CONFIG,
      ...(menuData.displayConfig ?? {}),
    };
  }

  if (updates.order === undefined) updates.order = menuData.order ?? 0;
  return updates;
}

/* -------------------------------------------------------------------------- */
/*                              S3 asset helpers                              */
/* -------------------------------------------------------------------------- */

function collectTreeFeaturedImages(items?: IMenuItem[]): string[] {
  if (!items?.length) return [];
  return items.flatMap((item) => [
    ...(item.featured?.image ? [item.featured.image] : []),
    ...collectTreeFeaturedImages(item.children ?? []),
  ]);
}

function diffRemoved(oldList: string[], nextList: string[]): string[] {
  const next = new Set(nextList);
  return oldList.filter((img) => !next.has(img));
}

async function safeDeleteS3(key: string, label = "menu asset") {
  try {
    await deleteS3Object(key);
  } catch (err) {
    console.error(`Failed to delete ${label}:`, key, err);
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Mutations                                  */
/* -------------------------------------------------------------------------- */

export async function createMenu(menuData: any): Promise<ActionResult<any>> {
  try {
    await connection();

    const validationError = validateMenuData(menuData);
    if (validationError) return { success: false, error: validationError };

    const existing = await Menu.findOne({ name: menuData.name.trim() });
    if (existing) {
      return { success: false, error: "A menu with this name already exists" };
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

export async function updateMenu(
  id: string,
  menuData: any,
): Promise<ActionResult<any>> {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid menu ID" };
    }

    const validationError = validateMenuData(menuData);
    if (validationError) return { success: false, error: validationError };

    const current = await Menu.findById(id);
    if (!current) return { success: false, error: "Menu not found" };

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

    const oldLocation = current.location ?? "";
    const nextLocation = (menuData.location ?? "") as string;
    const locationChanged = oldLocation !== nextLocation;

    const oldAssets = {
      image: current.image,
      background: current.backgroundImage,
      featured: collectTreeFeaturedImages(current.items),
    };

    const updates = buildMenuUpdates(menuData);
    Object.assign(current, updates);
    await current.save();

    if (oldAssets.image && oldAssets.image !== current.image) {
      await safeDeleteS3(oldAssets.image, "menu image");
    }

    // Preserve background assets when the menu just moved locations. A
    // NavBar menu can't carry a background image, but if the admin moves
    // it back to Banner later they shouldn't have to re-upload.
    if (
      oldAssets.background &&
      oldAssets.background !== current.backgroundImage &&
      !locationChanged
    ) {
      await safeDeleteS3(oldAssets.background, "menu background");
    }

    for (const key of diffRemoved(
      oldAssets.featured,
      collectTreeFeaturedImages(current.items),
    )) {
      await safeDeleteS3(key, "featured image");
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

export async function deleteMenu(id: string): Promise<ActionResult<null>> {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid menu ID" };
    }

    const menu = await Menu.findById(id);
    if (!menu) return { success: false, error: "Menu not found" };

    for (const key of [
      menu.image,
      menu.backgroundImage,
      ...collectTreeFeaturedImages(menu.items),
    ]) {
      if (key) await safeDeleteS3(key, "menu asset");
    }

    await Menu.findByIdAndDelete(id);
    revalidateMenuConsumers();
    return { success: true, data: null, message: "Menu deleted successfully" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                              Media cleanups                                */
/* -------------------------------------------------------------------------- */

export async function deleteMenuBackgroundImage(
  menuId: string,
): Promise<ActionResult<null>> {
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
    await safeDeleteS3(menu.backgroundImage, "menu background");
    menu.backgroundImage = "";
    await menu.save();
    revalidateMenuConsumers();
    return { success: true, data: null, message: "Background image removed" };
  } catch (error: any) {
    return { success: false, error: "Failed to delete image" };
  }
}

export async function deleteMenuImage(
  menuId: string,
): Promise<ActionResult<null>> {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return { success: false, error: "Invalid menu ID" };
    }
    const menu = await Menu.findById(menuId);
    if (!menu) return { success: false, error: "Menu not found" };
    if (!menu.image) return { success: false, error: "No image to delete" };
    await safeDeleteS3(menu.image, "menu image");
    menu.image = "";
    await menu.save();
    revalidateMenuConsumers();
    return { success: true, data: null, message: "Image removed" };
  } catch (error: any) {
    return { success: false, error: "Failed to delete image" };
  }
}
