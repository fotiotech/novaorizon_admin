// constant/types/menu.ts
//
// Browser-safe menu display constants/types. Mirrors what the admin UI needs
// from the backend's Menu model without importing Mongoose.
import type {
  Alignment,
  Animation,
  MenuDisplayType,
  MenuLocation,
  Position,
  SubmenuDisplayType,
} from "@/lib/menu/constants";

export const MENU_THEMES = ["light", "dark", "inherit"] as const;
export type MenuTheme = (typeof MENU_THEMES)[number];

export const MAX_FEATURED_SLOTS = 4;

export interface IMenuFeaturedSlot {
  image?: string;
  title?: string;
  href?: string;
  ctaText?: string;
  badge?: string;
}

export interface IMenuDisplayConfig {
  alignment: Alignment;
  gap: number;
  animation: Animation;
  showCaret: boolean;
  megaWidth: string;
  theme: MenuTheme;
  borderless: boolean;
  rounded: boolean;
  shadow: boolean;
}

export const DEFAULT_DISPLAY_CONFIG: IMenuDisplayConfig = {
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

export const FALLBACK_SUBMENU_DISPLAY: SubmenuDisplayType = "dropdown";

export type { MenuDisplayType, MenuLocation, Position, SubmenuDisplayType };
