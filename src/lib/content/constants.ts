// lib/content/constants.ts

/* -------------------------------------------------------------------------- */
/*                   Re-exports — canonical in collectionTypes                */
/* -------------------------------------------------------------------------- */

// CARD_SHAPES / CTA_STYLES are shared between Collection and Block models.
// Canonical home is `collectionTypes.ts` (block re-uses collection enums).
export { CARD_SHAPES, CTA_STYLES } from "./collectionTypes";
export type { CardShape, CtaStyle } from "./collectionTypes";

/* -------------------------------------------------------------------------- */
/*                               Block location                               */
/* -------------------------------------------------------------------------- */

/** Where content blocks can be placed. */
export const BLOCK_LOCATIONS = ["Home", "ProductRelated"] as const;
export type BlockLocation = (typeof BLOCK_LOCATIONS)[number];

/* -------------------------------------------------------------------------- */
/*                                Block display                               */
/* -------------------------------------------------------------------------- */

/** Top-level layout of the block. `banner` is block-only. */
export const BLOCK_DISPLAYS = [
  "grid",
  "carousel",
  "list",
  "hero",
  "banner",
] as const;
export type BlockDisplay = (typeof BLOCK_DISPLAYS)[number];

/* -------------------------------------------------------------------------- */
/*                                 Block source                               */
/* -------------------------------------------------------------------------- */

/** How the block resolves its entities. */
export const BLOCK_SOURCE_TYPES = [
  "collection",
  "category",
  "promotion",
  "manual",
] as const;
export type BlockSourceType = (typeof BLOCK_SOURCE_TYPES)[number];

/** What a promotion source renders. */
export const PROMOTION_MODES = ["products", "self"] as const;
export type PromotionMode = (typeof PROMOTION_MODES)[number];

/** Manual refs can point at any of these models. */
export const BLOCK_REF_MODELS = [
  "Category",
  "Product",
  "Collection",
  "Brand",
  "Promotion",
  "Page",
] as const;
export type BlockRefModel = (typeof BLOCK_REF_MODELS)[number];

/* -------------------------------------------------------------------------- */
/*                            Layout primitives                               */
/* -------------------------------------------------------------------------- */

/** Grid column counts. */
export const BLOCK_COLUMN_COUNTS = [1, 2, 3, 4, 5, 6] as const;

/** Block-level theme. */
export const BLOCK_THEMES = ["light", "dark", "inherit"] as const;
export type BlockTheme = (typeof BLOCK_THEMES)[number];

/** Block-level animation for carousel. */
export const BLOCK_ANIMATIONS = ["none", "fade", "slide", "scale"] as const;
export type BlockAnimation = (typeof BLOCK_ANIMATIONS)[number];

/** Block-level alignment. */
export const BLOCK_ALIGNMENTS = ["start", "center", "end", "stretch"] as const;
export type BlockAlignment = (typeof BLOCK_ALIGNMENTS)[number];

/* -------------------------------------------------------------------------- */
/*                                   Limits                                   */
/* -------------------------------------------------------------------------- */

export const DEFAULT_BLOCK_LIMIT = 12;
export const MAX_BLOCK_LIMIT = 60;

/* -------------------------------------------------------------------------- */
/*                              Display config                                */
/* -------------------------------------------------------------------------- */

import type { CardShape } from "./collectionTypes";

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
};

/* -------------------------------------------------------------------------- */
/*                       Source-specific display directives                   */
/* -------------------------------------------------------------------------- */

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

export const CARD_SIZES = ["sm", "md", "lg"] as const;
export type CardSize = (typeof CARD_SIZES)[number];

export const CARD_VARIANTS = ["card", "bare"] as const;
export type CardVariant = (typeof CARD_VARIANTS)[number];

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
