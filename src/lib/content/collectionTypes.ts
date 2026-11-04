// lib/content/collectionTypes.ts
export const TARGET_TYPES = [
  "Product",
  "Category",
  "Brand",
  "Promotion",
  "Collection",
] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export const DISPLAY_LAYOUTS = ["carousel", "grid", "list", "hero"] as const;
export type DisplayLayout = (typeof DISPLAY_LAYOUTS)[number];

export const CARD_SHAPES = ["default", "circle"] as const;
export type CardShape = (typeof CARD_SHAPES)[number];

export const CTA_STYLES = ["none", "link", "button"] as const;
export type CtaStyle = (typeof CTA_STYLES)[number];

/** How a rule value should be coerced before hitting MongoDB. */
export const VALUE_TYPES = ["string", "number", "boolean", "date"] as const;
export type ValueType = (typeof VALUE_TYPES)[number];
