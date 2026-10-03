// lib/menu/constants.ts

/**
 * Locations a menu can render into. These are all navigation surfaces —
 * chrome that wraps page content (header, drawer, footer) or ambient
 * strips. In-page content feeds (homepage sections, related-items rails)
 * live on ContentBlock, not Menu.
 */
export const MENU_LOCATIONS = [
  "Banner",
  "NavBar",
  "SideBar",
  "Footer",
  "mobile",
] as const;

export const LINK_TYPES = [
  "category",
  "product",
  "collection",
  "page",
  "custom",
] as const;

export const REF_MODELS = ["Category", "Product", "Collection"] as const;
export const REF_TYPES = ["category", "product", "collection"] as const;

export const MAX_DEPTH = 3;

/**
 * Top-level layout of the menu.
 * - `horizontal` → inline row (header bar)
 * - `vertical`   → stacked column (side drawer)
 * - `mega`       → inline row that opens wide mega panels
 * - `grid`       → wrapping card grid
 */
export const MENU_DISPLAY_TYPES = [
  "horizontal",
  "vertical",
  "mega",
  "grid",
] as const;

export const SUBMENU_DISPLAY_TYPES = [
  "dropdown",
  "flyout",
  "mega",
  "grid",
  "accordion",
] as const;

export const ALIGNMENTS = ["start", "center", "end", "stretch"] as const;

export const POSITIONS = [
  "bottom-start",
  "bottom-end",
  "right-start",
  "right-end",
] as const;

export const ANIMATIONS = ["none", "fade", "slide", "scale"] as const;

export const COLUMN_COUNTS = [2, 3, 4, 5, 6] as const;

/* ------------------------------- Types ------------------------------------ */

export type MenuLocation = (typeof MENU_LOCATIONS)[number];
export type LinkType = (typeof LINK_TYPES)[number];
export type RefModel = (typeof REF_MODELS)[number];
export type MenuDisplayType = (typeof MENU_DISPLAY_TYPES)[number];
export type SubmenuDisplayType = (typeof SUBMENU_DISPLAY_TYPES)[number];
export type Alignment = (typeof ALIGNMENTS)[number];
export type Position = (typeof POSITIONS)[number];
export type Animation = (typeof ANIMATIONS)[number];

export const GRID_SUBMENUS: readonly SubmenuDisplayType[] = ["mega", "grid"];

export const REF_MODEL_BY_TYPE: Record<string, RefModel> = {
  category: "Category",
  product: "Product",
  collection: "Collection",
};
