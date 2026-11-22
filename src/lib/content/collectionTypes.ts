// lib/content/collectionTypes.ts

/* ------------------------------ Target types ----------------------------- */

export const TARGET_TYPES = [
  "Product",
  "Category",
  "Brand",
  "Promotion",
  "Collection",
] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

/* -------------------------------- Shapes --------------------------------- */

export const CARD_SHAPES = ["default", "circle"] as const;
export type CardShape = (typeof CARD_SHAPES)[number];

/* --------------------------------- CTAs ---------------------------------- */

export const CTA_STYLES = ["none", "link", "button"] as const;
export type CtaStyle = (typeof CTA_STYLES)[number];

/* ------------------------------ Value types ------------------------------ */

/** How a rule value should be coerced before hitting MongoDB. */
export const VALUE_TYPES = ["string", "number", "boolean", "date"] as const;
export type ValueType = (typeof VALUE_TYPES)[number];

/* ------------------------- Collection source type ------------------------ */

/** How a collection resolves its items. */
export const COLLECTION_TYPES = ["rule", "manual", "recommendation"] as const;
export type CollectionType = (typeof COLLECTION_TYPES)[number];

/* -------------------------- Shared limits & paths ------------------------ */

/** Max items a manual collection can hold. Used by actions + form. */
export const COLLECTION_MANUAL_LIMIT = 50;

/** Admin collection list route. Used by actions + form. */
export const COLLECTION_LIST_PATH = "/catalog/collections";