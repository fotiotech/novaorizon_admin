// lib/content/constants.ts

export { CARD_SHAPES, CTA_STYLES } from "./collectionTypes";
export type { CardShape, CtaStyle } from "./collectionTypes";

/* ----------------------------- Block location ---------------------------- */

export const BLOCK_LOCATIONS = ["Home", "ProductRelated"] as const;
export type BlockLocation = (typeof BLOCK_LOCATIONS)[number];

/* ------------------------------ Block source ----------------------------- */

export const BLOCK_SOURCE_TYPES = [
  "collection",
  "category",
  "promotion",
  "manual",
  "banner",
] as const;
export type BlockSourceType = (typeof BLOCK_SOURCE_TYPES)[number];

export const PROMOTION_MODES = ["products", "self"] as const;
export type PromotionMode = (typeof PROMOTION_MODES)[number];

export const BLOCK_REF_MODELS = [
  "Category",
  "Product",
  "Collection",
  "Brand",
  "Promotion",
  "Page",
] as const;
export type BlockRefModel = (typeof BLOCK_REF_MODELS)[number];

/* ------------------------------ Block display ---------------------------- */

export const BLOCK_DISPLAYS = [
  "grid",
  "carousel",
  "list",
  "hero",
  "banner",
] as const;
export type BlockDisplay = (typeof BLOCK_DISPLAYS)[number];

/* --------------------------- Layout primitives --------------------------- */

export const BLOCK_COLUMN_COUNTS = [1, 2, 3, 4, 5, 6] as const;

export const BLOCK_THEMES = ["light", "dark", "inherit"] as const;
export type BlockTheme = (typeof BLOCK_THEMES)[number];

export const BLOCK_ANIMATIONS = ["none", "fade", "slide", "scale"] as const;
export type BlockAnimation = (typeof BLOCK_ANIMATIONS)[number];

export const BLOCK_ALIGNMENTS = ["start", "center", "end", "stretch"] as const;
export type BlockAlignment = (typeof BLOCK_ALIGNMENTS)[number];

/* ---------------------------- Card appearance ---------------------------- */

/**
 * Aspect ratios, ordered from tallest portrait to widest landscape.
 * New additions: 9:21, 1:2, 4:5, 5:4, 2:1, 21:9 for finer control over
 * the extremes and intermediate steps.
 */
export const CARD_RATIOS = [
  "9:21", // ~0.43 — very tall (phone portrait)
  "1:2", // 0.5
  "9:16", // 0.5625
  "2:3", // 0.67
  "3:4", // 0.75
  "4:5", // 0.8
  "1:1", // 1.0
  "5:4", // 1.25
  "4:3", // 1.33
  "3:2", // 1.5
  "16:9", // 1.78
  "2:1", // 2.0 — panoramic
  "21:9", // 2.33 — cinematic
] as const;
export type CardRatio = (typeof CARD_RATIOS)[number];

export const TITLE_POSITIONS = [
  "below",
  "overlay-bottom",
  "overlay-top",
  "hidden",
] as const;
export type TitlePosition = (typeof TITLE_POSITIONS)[number];

export const IMAGE_POSITIONS = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
] as const;
export type ImagePosition = (typeof IMAGE_POSITIONS)[number];

export const CARD_SIZES = ["sm", "md", "lg"] as const;
export type CardSize = (typeof CARD_SIZES)[number];

export const CARD_VARIANTS = ["card", "bare"] as const;
export type CardVariant = (typeof CARD_VARIANTS)[number];

/**
 * Card layout — how image and text relate inside each card.
 *
 *   stacked      → image on top, text below (default)
 *   image-left   → image on the left, text on the right
 *   image-right  → text on the left, image on the right
 *
 * Side layouts use a fixed image width so the text column reads cleanly.
 * Aspect ratio and title-position overlays are ignored in side mode.
 */
export const CARD_LAYOUTS = ["stacked", "image-left", "image-right"] as const;
export type CardLayout = (typeof CARD_LAYOUTS)[number];

/* -------------------------------- Limits --------------------------------- */

export const DEFAULT_BLOCK_LIMIT = 12;
export const MAX_BLOCK_LIMIT = 60;

/* ----------------------------- Display config ---------------------------- */

import type { CardShape, CtaStyle } from "./collectionTypes";

export interface BlockDisplayConfig {
  theme: BlockTheme;
  columns: number;
  gap: number;
  borderless: boolean;
  rounded: boolean;
  shadow: boolean;
  alignment: BlockAlignment;
  animation: BlockAnimation;
  cardShape: CardShape;
  cardRatio: CardRatio;
  cardSize: CardSize;
  cardLayout: CardLayout;
  titlePosition: TitlePosition;
  imagePosition: ImagePosition;
  backgroundColor: string;
  textColor: string;
}

export const DEFAULT_BLOCK_DISPLAY_CONFIG: BlockDisplayConfig = {
  theme: "inherit",
  columns: 4,
  gap: 16,
  borderless: false,
  rounded: true,
  shadow: false,
  alignment: "start",
  animation: "fade",
  cardShape: "default",
  cardRatio: "1:1",
  cardSize: "md",
  cardLayout: "stacked",
  titlePosition: "below",
  imagePosition: "center",
  backgroundColor: "",
  textColor: "",
};

/* -------------------- Source-specific display directives ------------------ */

export const PROMOTION_BADGE_STYLES = [
  "default",
  "code",
  "countdown",
  "none",
] as const;
export type PromotionBadgeStyle = (typeof PROMOTION_BADGE_STYLES)[number];

export const COLLECTION_COUNT_POSITIONS = ["none", "subline", "badge"] as const;
export type CollectionCountPosition =
  (typeof COLLECTION_COUNT_POSITIONS)[number];

export interface BlockSourceStyles {
  promotionBadgeStyle: PromotionBadgeStyle;
  promotionShowCode: boolean;
  collectionShowItemCount: boolean;
  collectionCountPosition: CollectionCountPosition;
  manualCardSize: CardSize;
  manualCardVariant: CardVariant;
  manualShowDescription: boolean;
}

export const DEFAULT_BLOCK_SOURCE_STYLES: BlockSourceStyles = {
  promotionBadgeStyle: "default",
  promotionShowCode: true,
  collectionShowItemCount: false,
  collectionCountPosition: "subline",
  manualCardSize: "md",
  manualCardVariant: "card",
  manualShowDescription: true,
};
