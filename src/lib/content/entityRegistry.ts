// lib/content/entityRegistry.ts
// SERVER-ONLY. Do not import this from client components — it pulls in the
// Mongoose models. Client components should import from
// `lib/content/entityMetadata.ts` instead.
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Promotion from "@/models/Promotion";
import Page from "@/models/Page";
import { Collection } from "@/models/Collection";
import type { Model } from "mongoose";
import {
  ENTITY_METADATA,
  getEntityMetadata,
  type AttributeConfig,
  type EntityMetadata,
  type RegistryKey,
} from "./entityMetadata";

export interface EntityConfig<T = any> extends EntityMetadata {
  model: Model<T>;
  href: (doc: T) => string;
  image: (doc: T) => string | undefined;
}

export const ENTITY_REGISTRY: Record<RegistryKey, EntityConfig> = {
  Product: {
    ...ENTITY_METADATA.Product,
    model: Product,
    href: (p: any) => `/products/${p.slug ?? p._id}`,
    image: (p: any) =>
      Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined,
  },
  Category: {
    ...ENTITY_METADATA.Category,
    model: Category,
    href: (c: any) => `/categories/${c.slug ?? c._id}`,
    image: (c: any) =>
      Array.isArray(c.imageUrl) && c.imageUrl.length > 0
        ? c.imageUrl[0]
        : undefined,
  },
  Brand: {
    ...ENTITY_METADATA.Brand,
    model: Brand,
    href: (b: any) => `/brands/${b.url_slug ?? b._id}`,
    image: (b: any) => b.logoUrl,
  },
  Promotion: {
    ...ENTITY_METADATA.Promotion,
    model: Promotion as any,
    href: (p: any) => `/promotions/${p.code ?? p._id}`,
    image: () => undefined,
  },
  Collection: {
    ...ENTITY_METADATA.Collection,
    model: Collection,
    href: (c: any) => `/catalog/collections/${c._id}`,
    image: (c: any) => c.imageUrl,
  },
  Page: {
    ...ENTITY_METADATA.Page,
    model: Page as any,
    href: (p: any) => p.url ?? `/pages/${p.slug ?? p._id}`,
    image: (p: any) =>
      Array.isArray(p.images) && p.images.length > 0
        ? p.images[0]
        : (p.image ?? undefined),
  },
};

export function getEntityConfig(key: string): EntityConfig | null {
  return (ENTITY_REGISTRY as Record<string, EntityConfig>)[key] ?? null;
}

// Re-export the client-safe helpers so server files have a single import
// point. Client files must import from `entityMetadata` directly.
export {
  ENTITY_METADATA,
  getEntityMetadata,
  getAttributesFor,
} from "./entityMetadata";
export type {
  AttributeConfig,
  EntityMetadata,
  RegistryKey,
} from "./entityMetadata";
