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

/* -------------------------------- Layouts -------------------------------- */

export const DISPLAY_LAYOUTS = ["carousel", "grid", "list", "hero"] as const;
export type DisplayLayout = (typeof DISPLAY_LAYOUTS)[number];

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

/* ------------------------------- Defaults -------------------------------- */

/**
 * Canonical defaults for a collection's display config.
 * Referenced by:
 *   - models/Collection.ts        → schema defaults
 *   - app/actions/collection.ts   → form parsing fallbacks
 *   - components/.../CollectionForm.tsx → initial form state
 * Change once, three callers follow.
 */
export const DEFAULT_COLLECTION_DISPLAY = {
  layout: "carousel" as DisplayLayout,
  columns: 4,
  gap: 16,
  showImages: true,
  cardShape: "default" as CardShape,
} as const;

/* -------------------------- Shared limits & paths ------------------------ */

/** Max items a manual collection can hold. Used by actions + form. */
export const COLLECTION_MANUAL_LIMIT = 50;

/** Admin collection list route. Used by actions + form. */
export const COLLECTION_LIST_PATH = "/catalog/collections";
