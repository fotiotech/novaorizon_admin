// lib/api/menu.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";
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

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: unknown): boolean {
  return typeof id === "string" && OBJECT_ID_RE.test(id);
}

function errorMessage(error: any, fallback = "Request failed"): string {
  return (
    (typeof error?.response?.data?.error === "string" &&
      error.response.data.error) ||
    (typeof error?.response?.data?.message === "string" &&
      error.response.data.message) ||
    (typeof error?.message === "string" && error.message) ||
    fallback
  );
}

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

export interface MenuItem {
  _id?: string;
  label?: string;
  type?: string;
  refId?: string | null;
  refModel?: string | null;
  url?: string;
  icon?: string | null;
  badge?: string | null;
  openInNewTab?: boolean;
  isVisible?: boolean;
  submenuDisplay?: string | null;
  columns?: number;
  submenuPosition?: string | null;
  align?: string | null;
  featured?: {
    image?: string;
    title?: string;
    href?: string;
    ctaText?: string;
    badge?: string;
  } | null;
  children?: MenuItem[];
  [key: string]: any;
}

export type EnrichedMenuItem = MenuItem & { slug: string | null };

/* -------------------------------------------------------------------------- */
/*                            Display config                                  */
/* -------------------------------------------------------------------------- */

const MENU_THEMES = ["light", "dark", "inherit"] as const;

const DEFAULT_DISPLAY_CONFIG: Record<string, any> = {
  alignment: "start",
  gap: 16,
  animation: "fade",
  showCaret: true,
  megaWidth: "960px",
  theme: "light",
  borderless: false,
  rounded: true,
  shadow: true,
};

/* -------------------------------------------------------------------------- */
/*                              Reference options                             */
/* -------------------------------------------------------------------------- */

/** GET /api/menus/ref-options — admin only */
export async function getMenuRefOptions(): Promise<
  ActionResult<MenuRefOptions>
> {
  try {
    const res = await api.get<{ data: MenuRefOptions }>("/menus/ref-options");

    return {
      success: true,
      data: res.data?.data as MenuRefOptions,
    };
  } catch (error: any) {
    return { success: false, error: errorMessage(error) };
  }
}

/* -------------------------------------------------------------------------- */
/*                                Read actions                                */
/* -------------------------------------------------------------------------- */

/** GET /api/menus/location/:location — public */
export async function getMenusByLocation(
  location: string,
): Promise<ActionResult<any[]>> {
  try {
    // The backend resolves reference slugs for every menu item.
    const res = await api.get<{ data: any[] }>(
      `/menus/location/${encodeURIComponent(location)}`,
    );

    return { success: true, data: res.data?.data ?? [] };
  } catch (error: any) {
    return { success: false, error: errorMessage(error) };
  }
}

/** GET /api/menus/:id — admin only */
export async function getMenuById(id: string): Promise<ActionResult<any>> {
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid menu ID" };
    }
    const res = await api.get<{ data: any }>(`/menus/${encodeURIComponent(id)}`);
    if (!res.data?.data) return { success: false, error: "Menu not found" };
    return { success: true, data: res.data.data };
  } catch (error: any) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return { success: false, error: "Menu not found" };
    }
    return { success: false, error: errorMessage(error) };
  }
}

/** GET /api/menus — admin only */
export async function getAllMenus(): Promise<ActionResult<any[]>> {
  try {
    const res = await api.get<{ data: any[] }>("/menus");
    return { success: true, data: res.data?.data ?? [] };
  } catch (error: any) {
    return { success: false, error: errorMessage(error) };
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
      if (!isValidObjectId(item.refId)) {
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
      _id: raw._id && isValidObjectId(raw._id) ? raw._id : undefined,
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
/*                                 Mutations                                  */
/* -------------------------------------------------------------------------- */

/** POST /api/menus — admin only */
export async function createMenu(menuData: any): Promise<ActionResult<any>> {
  try {
    const validationError = validateMenuData(menuData);
    if (validationError) return { success: false, error: validationError };

    const res = await api.post<{ data: any }>(
      "/menus",
      buildMenuUpdates(menuData),
    );

    return {
      success: true,
      data: res.data?.data,
      message: "Menu created successfully",
    };
  } catch (error: any) {
    return { success: false, error: errorMessage(error) };
  }
}

/** PATCH /api/menus/:id — admin only */
export async function updateMenu(
  id: string,
  menuData: any,
): Promise<ActionResult<any>> {
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid menu ID" };
    }

    const validationError = validateMenuData(menuData);
    if (validationError) return { success: false, error: validationError };

    // The backend owns the asset cleanup (image / background / featured)
    // and the duplicate-name check.
    const res = await api.patch<{ data: any }>(
      `/menus/${encodeURIComponent(id)}`,
      buildMenuUpdates(menuData),
    );

    return {
      success: true,
      data: res.data?.data,
      message: "Menu updated successfully",
    };
  } catch (error: any) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return { success: false, error: "Menu not found" };
    }
    return { success: false, error: errorMessage(error) };
  }
}

/** DELETE /api/menus/:id — admin only */
export async function deleteMenu(id: string): Promise<ActionResult<null>> {
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid menu ID" };
    }

    // The backend removes the menu's S3 assets before deleting the document.
    await api.delete(`/menus/${encodeURIComponent(id)}`);
    return { success: true, data: null, message: "Menu deleted successfully" };
  } catch (error: any) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return { success: false, error: "Menu not found" };
    }
    return { success: false, error: errorMessage(error) };
  }
}

/* -------------------------------------------------------------------------- */
/*                              Media cleanups                                */
/* -------------------------------------------------------------------------- */

/** DELETE /api/menus/:id/background — admin only */
export async function deleteMenuBackgroundImage(
  menuId: string,
): Promise<ActionResult<null>> {
  try {
    if (!isValidObjectId(menuId)) {
      return { success: false, error: "Invalid menu ID" };
    }

    await api.delete(`/menus/${encodeURIComponent(menuId)}/background`);
    return { success: true, data: null, message: "Background image removed" };
  } catch (error: any) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return { success: false, error: errorMessage(error) };
    }
    return { success: false, error: "Failed to delete image" };
  }
}

/** DELETE /api/menus/:id/image — admin only */
export async function deleteMenuImage(
  menuId: string,
): Promise<ActionResult<null>> {
  try {
    if (!isValidObjectId(menuId)) {
      return { success: false, error: "Invalid menu ID" };
    }

    await api.delete(`/menus/${encodeURIComponent(menuId)}/image`);
    return { success: true, data: null, message: "Image removed" };
  } catch (error: any) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return { success: false, error: errorMessage(error) };
    }
    return { success: false, error: "Failed to delete image" };
  }
}
