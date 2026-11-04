// lib/content/entityMetadata.ts
import type { TargetType, CardShape, ValueType } from "./collectionTypes";

export type RegistryKey = TargetType | "Page";

export interface AttributeConfig {
  label: string;
  value: string;
  /** If set, the value is an ObjectId reference to another model. */
  ref?: RegistryKey;
  /** How to coerce the stored value before the query runs. */
  valueType?: ValueType;
}

export interface EntityMetadata {
  label: string;
  singular: string;
  attributes: AttributeConfig[];

  supportsRule: boolean;
  supportsManual: boolean;

  supportsRecommendation: boolean;
  recommendationTypes?: string[];
  requiresUserContext?: boolean;

  defaultCardShape?: CardShape;
}

/* -------------------------- Product attributes -------------------------- */

const PRODUCT_ATTRIBUTES: AttributeConfig[] = [
  { label: "Category", value: "categoryId", ref: "Category" },
  { label: "Name", value: "name" },
  { label: "Brand", value: "brand", ref: "Brand" },
  { label: "Weight", value: "weight", valueType: "number" },
  { label: "Length", value: "length", valueType: "number" },
  { label: "Width", value: "width", valueType: "number" },
  { label: "Height", value: "height", valueType: "number" },
  { label: "Color", value: "color" },
  { label: "Images", value: "images" },
  { label: "List Price", value: "listPrice", valueType: "number" },
  { label: "Price", value: "price", valueType: "number" },
  { label: "Stock Status", value: "stockStatus" },
  { label: "Quantity", value: "quantity", valueType: "number" },
  { label: "Short Description", value: "shortDescription" },
  { label: "Description", value: "description" },
  { label: "Primary Material", value: "primaryMaterial" },
  { label: "Origin Country", value: "originCountry" },
  { label: "Warranty Period", value: "warrantyPeriod" },
  { label: "Meta Title", value: "metaTitle" },
  { label: "Status", value: "status" },
  { label: "Tags", value: "tags" },

  // ── Materialized recommendation signals ─────────────────────────
  { label: "Featured", value: "isFeatured", valueType: "boolean" },
  { label: "Trending", value: "isTrending", valueType: "boolean" },
  { label: "Trending Rank", value: "trendingRank", valueType: "number" },
  { label: "Bestseller", value: "isBestseller", valueType: "boolean" },
  { label: "Bestseller Rank", value: "bestsellerRank", valueType: "number" },
  { label: "New Arrival", value: "isNew", valueType: "boolean" },
  { label: "Created At", value: "createdAt", valueType: "date" },
];

const CATEGORY_ATTRIBUTES: AttributeConfig[] = [
  { label: "Slug", value: "slug" },
  { label: "Name", value: "name" },
  { label: "Parent Category", value: "parentId", ref: "Category" },
  { label: "Description", value: "description" },
  { label: "Image URL", value: "imageUrl" },
  { label: "Inherit Property", value: "inheritProperty", valueType: "boolean" },
  { label: "SEO Title", value: "seoTitle" },
  { label: "SEO Description", value: "seoDesc" },
  { label: "Keywords", value: "keywords" },
  { label: "Sort Order", value: "sortOrder", valueType: "number" },
  { label: "Status", value: "status" },
];

const BRAND_ATTRIBUTES: AttributeConfig[] = [
  { label: "Name", value: "name" },
  { label: "URL Slug", value: "url_slug" },
  { label: "Logo URL", value: "logoUrl" },
  { label: "Status", value: "status" },
];

const PROMOTION_ATTRIBUTES: AttributeConfig[] = [
  { label: "Name", value: "name" },
  { label: "Code", value: "code" },
  { label: "Description", value: "description" },
  { label: "Calculation Type", value: "promotionType.calculationType" },
  { label: "Scope Applies To", value: "scope.appliesTo" },
  { label: "Priority", value: "priority", valueType: "number" },
  { label: "Active", value: "isActive", valueType: "boolean" },
  { label: "Start Date", value: "startDate", valueType: "date" },
  { label: "End Date", value: "endDate", valueType: "date" },
];

const COLLECTION_ATTRIBUTES: AttributeConfig[] = [
  { label: "Name", value: "name" },
  { label: "Description", value: "description" },
  { label: "Image URL", value: "imageUrl" },
  { label: "Type", value: "type" },
  { label: "Target Type", value: "targetType" },
  { label: "Status", value: "status" },
  { label: "Order", value: "order", valueType: "number" },
];

const PAGE_ATTRIBUTES: AttributeConfig[] = [
  { label: "Name", value: "name" },
  { label: "Title", value: "title" },
  { label: "Slug", value: "slug" },
  { label: "URL", value: "url" },
  { label: "Status", value: "status" },
];

/* ------------------------------ metadata -------------------------------- */

export const ENTITY_METADATA: Record<RegistryKey, EntityMetadata> = {
  Product: {
    label: "Products",
    singular: "Product",
    attributes: PRODUCT_ATTRIBUTES,
    supportsRule: true,
    supportsManual: true,
    supportsRecommendation: true,
    // "trending" was materialized → drop it. Only per-user kinds remain.
    recommendationTypes: ["personalized", "recentlyViewed"],
    requiresUserContext: true,
    defaultCardShape: "default",
  },
  Category: {
    label: "Categories",
    singular: "Category",
    attributes: CATEGORY_ATTRIBUTES,
    supportsRule: true,
    supportsManual: true,
    supportsRecommendation: false,
    defaultCardShape: "circle",
  },
  Brand: {
    label: "Brands",
    singular: "Brand",
    attributes: BRAND_ATTRIBUTES,
    supportsRule: true,
    supportsManual: true,
    supportsRecommendation: false,
    defaultCardShape: "default",
  },
  Promotion: {
    label: "Promotions",
    singular: "Promotion",
    attributes: PROMOTION_ATTRIBUTES,
    supportsRule: true,
    supportsManual: true,
    supportsRecommendation: false,
    defaultCardShape: "default",
  },
  Collection: {
    label: "Collections",
    singular: "Collection",
    attributes: COLLECTION_ATTRIBUTES,
    supportsRule: true,
    supportsManual: true,
    supportsRecommendation: false,
    defaultCardShape: "default",
  },
  Page: {
    label: "Pages",
    singular: "Page",
    attributes: PAGE_ATTRIBUTES,
    supportsRule: false,
    supportsManual: true,
    supportsRecommendation: false,
    defaultCardShape: "default",
  },
};

export function getEntityMetadata(key: string): EntityMetadata | null {
  return (ENTITY_METADATA as Record<string, EntityMetadata>)[key] ?? null;
}

export function getAttributesFor(key: string): AttributeConfig[] {
  return getEntityMetadata(key)?.attributes ?? [];
}
