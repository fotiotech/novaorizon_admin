// lib/content/constants.ts

/** Where content blocks can be placed. */
export const BLOCK_LOCATIONS = ["Home", "ProductRelated"] as const;
export type BlockLocation = (typeof BLOCK_LOCATIONS)[number];

/**
 * Top-level layout of the block. Card shape is NOT a layout concern —
 * it lives in displayConfig.cardShape so any layout can pair with it.
 */
export const BLOCK_DISPLAYS = ["grid", "carousel", "list", "hero"] as const;
export type BlockDisplay = (typeof BLOCK_DISPLAYS)[number];

/** How the block resolves its entities. */
export const BLOCK_SOURCE_TYPES = [
  "collection",
  "category",
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

/**
 * Card shape — orthogonal to layout. `default` follows the panel's
 * `rounded` flag; `circle` renders a fully circular image with the name
 * centered below (works in grid, carousel, list).
 */
export const CARD_SHAPES = ["default", "circle"] as const;
export type CardShape = (typeof CARD_SHAPES)[number];

/** Default limit for a block's resolved items. */
export const DEFAULT_BLOCK_LIMIT = 12;

/** Hard upper bound. */
export const MAX_BLOCK_LIMIT = 60;

/* --------------------------- Display config ------------------------------ */

export interface BlockDisplayConfig {
  theme: BlockTheme;
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
  gap: 16,
  borderless: false,
  rounded: true,
  shadow: false,
  alignment: "start",
  animation: "fade",
  cardShape: "default",
};

/* ------------------- Source-specific display directives ------------------ */

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

export const RECOMMENDATION_BADGE_STYLES = [
  "default",
  "trending",
  "personalized",
  "recentlyViewed",
  "none",
] as const;
export type RecommendationBadgeStyle =
  (typeof RECOMMENDATION_BADGE_STYLES)[number];

export const RELATED_VARIANTS = ["default", "compact", "withScore"] as const;
export type RelatedVariant = (typeof RELATED_VARIANTS)[number];

export const CARD_SIZES = ["sm", "md", "lg"] as const;
export type CardSize = (typeof CARD_SIZES)[number];

export const CARD_VARIANTS = ["card", "bare"] as const;
export type CardVariant = (typeof CARD_VARIANTS)[number];

export interface BlockSourceStyles {
  /* promotion */
  promotionBadgeStyle: PromotionBadgeStyle;
  promotionShowCode: boolean;

  /* collection */
  collectionShowItemCount: boolean;
  collectionCountPosition: CollectionCountPosition;

  /* recommendation */
  recommendationBadgeStyle: RecommendationBadgeStyle;
  recommendationShowReason: boolean;

  /* related */
  relatedVariant: RelatedVariant;
  relatedShowScore: boolean;

  /* manual */
  manualCardSize: CardSize;
  manualCardVariant: CardVariant;
  manualShowDescription: boolean;
}

export const DEFAULT_BLOCK_SOURCE_STYLES: BlockSourceStyles = {
  promotionBadgeStyle: "default",
  promotionShowCode: true,
  collectionShowItemCount: false,
  collectionCountPosition: "subline",
  recommendationBadgeStyle: "default",
  recommendationShowReason: false,
  relatedVariant: "default",
  relatedShowScore: false,
  manualCardSize: "md",
  manualCardVariant: "card",
  manualShowDescription: true,
};
