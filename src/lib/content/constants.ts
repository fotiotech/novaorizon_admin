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
  "editorial",
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

/**
 * Displays any source can use: collection, category, promotion, manual,
 * and editorial-with-images[].
 */
export const STANDARD_DISPLAYS = [
  "grid",
  "carousel",
  "list",
  "hero",
  "banner",
] as const;
export type StandardDisplay = (typeof STANDARD_DISPLAYS)[number];

/**
 * Displays only valid when `source.type === "editorial"`. They render the
 * editorial's story (eyebrow / body / image / secondaryImage) with
 * story-first layout. Grouped under `"feature-*"` so they sort together
 * in the form.
 */
export const FEATURE_DISPLAYS = [
  "feature-split-left",
  "feature-split-right",
  "feature-overlay",
  "feature-stacked",
  "feature-duo",
] as const;
export type FeatureDisplay = (typeof FEATURE_DISPLAYS)[number];

export const BLOCK_DISPLAYS = [
  ...STANDARD_DISPLAYS,
  ...FEATURE_DISPLAYS,
] as const;
export type BlockDisplay = (typeof BLOCK_DISPLAYS)[number];

export function isFeatureDisplay(d: string): d is FeatureDisplay {
  return (FEATURE_DISPLAYS as readonly string[]).includes(d);
}

export function isStandardDisplay(d: string): d is StandardDisplay {
  return (STANDARD_DISPLAYS as readonly string[]).includes(d);
}

/** Displays allowed for a given source type. */
export function displaysForSource(sourceType: string): readonly BlockDisplay[] {
  return sourceType === "editorial" ? BLOCK_DISPLAYS : STANDARD_DISPLAYS;
}

/* --------------------------- Layout primitives --------------------------- */

export const BLOCK_COLUMN_COUNTS = [1, 2, 3, 4, 5, 6] as const;

export const BLOCK_THEMES = ["light", "dark", "inherit"] as const;
export type BlockTheme = (typeof BLOCK_THEMES)[number];

export const BLOCK_ANIMATIONS = ["none", "fade", "slide", "scale"] as const;
export type BlockAnimation = (typeof BLOCK_ANIMATIONS)[number];

export const BLOCK_ALIGNMENTS = ["start", "center", "end", "stretch"] as const;
export type BlockAlignment = (typeof BLOCK_ALIGNMENTS)[number];

/* ---------------------------- Card appearance ---------------------------- */

export const CARD_RATIOS = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "3:2",
  "2:3",
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
