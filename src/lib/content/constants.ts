// lib/content/constants.ts

/** Where content blocks can be placed. */
export const BLOCK_LOCATIONS = ["Home", "ProductRelated"] as const;
export type BlockLocation = (typeof BLOCK_LOCATIONS)[number];

/** Top-level layout of the block. */
export const BLOCK_DISPLAYS = ["grid", "carousel", "list", "hero"] as const;
export type BlockDisplay = (typeof BLOCK_DISPLAYS)[number];

/** How the block resolves its entities. */
export const BLOCK_SOURCE_TYPES = [
  "collection",
  "promotion",
  "manual",
  "recommendation",
  "related",
] as const;
export type BlockSourceType = (typeof BLOCK_SOURCE_TYPES)[number];

/** Recommendation kinds — mirrors Collection.recommendationType. */
export const RECOMMENDATION_KINDS = [
  "trending",
  "personalized",
  "recentlyViewed",
] as const;
export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

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

/** CTA style. */
export const CTA_STYLES = ["button", "link", "none"] as const;
export type CtaStyle = (typeof CTA_STYLES)[number];

/** Default limit for a block's resolved items. */
export const DEFAULT_BLOCK_LIMIT = 12;

/** Hard upper bound. */
export const MAX_BLOCK_LIMIT = 60;

/* --------------------------- Defaults ------------------------------------- */

export interface BlockDisplayConfig {
  theme: BlockTheme;
  gap: number;
  borderless: boolean;
  rounded: boolean;
  shadow: boolean;
  alignment: BlockAlignment;
  animation: BlockAnimation;
}

export const DEFAULT_BLOCK_DISPLAY_CONFIG: BlockDisplayConfig = {
  theme: "inherit",
  gap: 16,
  borderless: false,
  rounded: true,
  shadow: false,
  alignment: "start",
  animation: "fade",
};
