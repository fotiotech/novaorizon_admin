// lib/content/resolve.ts
import mongoose from "mongoose";
import { Collection } from "@/models/Collection";
import { buildQueryFromRules, pickSlug } from "./query";
import { getEntityConfig } from "./entityRegistry";
import { getRecommendationResolver } from "./recommendationResolvers";
import type { BlockRefModel } from "./constants";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export interface ResolveContext {
  userId?: string;
}

export interface NormalizedContentItem {
  _id: string;
  name: string;
  image: string | null;
  description?: string | null;
  href: string;
  contentType: BlockRefModel;
  price?: number | null;
  listPrice?: number | null;
  badge?: string | null;
  subline?: string | null;
  meta?: { code?: string };
}

/* -------------------------------------------------------------------------- */
/*                             URL construction                               */
/* -------------------------------------------------------------------------- */

function buildHref(
  refModel: BlockRefModel,
  refId: string,
  slug: string | null,
  url?: string | null,
): string {
  if (refModel === "Page" && url) return url;
  const prefix: Record<BlockRefModel, string> = {
    Product: "products",
    Category: "category",
    Collection: "collections",
    Brand: "brands",
    Promotion: "promotions",
    Page: "pages",
  };
  const p = prefix[refModel];
  return slug ? `/${p}/${slug}/${refId}` : `/${p}/${refId}`;
}

/* -------------------------------------------------------------------------- */
/*                                Normalizers                                 */
/* -------------------------------------------------------------------------- */

function firstImage(doc: any): string | null {
  if (Array.isArray(doc.images) && doc.images.length > 0) return doc.images[0];
  if (Array.isArray(doc.imageUrl) && doc.imageUrl.length > 0)
    return doc.imageUrl[0];
  return doc.image ?? doc.mainImage ?? doc.logoUrl ?? null;
}

function normalizeProduct(doc: any): NormalizedContentItem {
  return {
    _id: String(doc._id),
    name: doc.name || "Untitled",
    image: firstImage(doc),
    href: buildHref("Product", String(doc._id), pickSlug(doc) || null),
    contentType: "Product",
    price: typeof doc.price === "number" ? doc.price : null,
    listPrice: typeof doc.listPrice === "number" ? doc.listPrice : null,
  };
}

function normalizeCategory(doc: any): NormalizedContentItem {
  return {
    _id: String(doc._id),
    name: doc.name || "Untitled",
    image: firstImage(doc),
    description: doc.description ?? null,
    href: buildHref("Category", String(doc._id), pickSlug(doc) || null),
    contentType: "Category",
  };
}

function normalizeCollection(doc: any): NormalizedContentItem {
  return {
    _id: String(doc._id),
    name: doc.name || "Untitled",
    image: firstImage(doc),
    description: doc.description ?? null,
    href: buildHref("Collection", String(doc._id), pickSlug(doc) || null),
    contentType: "Collection",
  };
}

function normalizeBrand(doc: any): NormalizedContentItem {
  return {
    _id: String(doc._id),
    name: doc.name || "Untitled",
    image: firstImage(doc),
    href: buildHref(
      "Brand",
      String(doc._id),
      doc.url_slug ?? pickSlug(doc) ?? null,
    ),
    contentType: "Brand",
  };
}

function normalizePromotion(doc: any): NormalizedContentItem {
  return {
    _id: String(doc._id),
    name: doc.name || "Untitled",
    image: null,
    description: doc.description ?? null,
    href: buildHref("Promotion", String(doc._id), null),
    contentType: "Promotion",
    badge: doc.code ?? null,
    meta: { code: doc.code ?? undefined },
  };
}

function normalizePage(doc: any): NormalizedContentItem {
  return {
    _id: String(doc._id),
    name: doc.name || doc.title || "Untitled",
    image: firstImage(doc),
    href: buildHref("Page", String(doc._id), pickSlug(doc) || null, doc.url),
    contentType: "Page",
  };
}

export function normalizeContentItem(
  doc: any,
  refModel: BlockRefModel,
): NormalizedContentItem {
  switch (refModel) {
    case "Product":
      return normalizeProduct(doc);
    case "Category":
      return normalizeCategory(doc);
    case "Collection":
      return normalizeCollection(doc);
    case "Brand":
      return normalizeBrand(doc);
    case "Promotion":
      return normalizePromotion(doc);
    case "Page":
    default:
      return normalizePage(doc);
  }
}

/* -------------------------------------------------------------------------- */
/*                            Collection resolver                             */
/* -------------------------------------------------------------------------- */

/**
 * Resolves a single Collection into display-ready items. Handles all three
 * types the unified model supports:
 *
 *   rule           → compiled from `collection.rules` via the entity registry
 *   manual         → hydrated from `collection.items` in the order stored
 *   recommendation → delegated to `RECOMMENDATION_RESOLVERS[targetType]`
 *
 * Inactive collections always return `[]`.
 */
export async function resolveCollection(
  collectionId: string | mongoose.Types.ObjectId,
  ctx: ResolveContext = {},
  limitOverride?: number,
): Promise<NormalizedContentItem[]> {
  const collection: any = await Collection.findById(collectionId).lean();
  if (!collection || collection.status === "inactive") return [];

  const limit =
    limitOverride ??
    (collection.type === "recommendation"
      ? (collection.recommendationLimit ?? 10)
      : 20);

  const targetType = collection.targetType as BlockRefModel;
  const cfg = getEntityConfig(targetType);
  if (!cfg) return [];

  if (collection.type === "recommendation") {
    const resolver = getRecommendationResolver(targetType);
    if (!resolver) return [];
    const raw = await resolver(collection.recommendationType ?? "", limit, {
      userId: ctx.userId,
    });
    return raw.map((d) => normalizeContentItem(d, targetType));
  }

  if (collection.type === "rule") {
    const query = buildQueryFromRules(
      collection.rules ?? [],
      targetType as any,
    );
    if (Object.keys(query).length === 0) return [];
    let q = (cfg.model as mongoose.Model<any>).find(query).limit(limit);
    if (collection.sort?.field) {
      q = q.sort({
        [collection.sort.field]: collection.sort.direction === "asc" ? 1 : -1,
      });
    }
    const docs = await q.lean();
    return (docs as any[]).map((d) => normalizeContentItem(d, targetType));
  }

  if (collection.type === "manual") {
    const ids = (collection.items ?? []).slice(0, limit);
    if (!ids.length) return [];
    const docs = await (cfg.model as mongoose.Model<any>)
      .find({ _id: { $in: ids } })
      .lean();
    const byId = new Map((docs as any[]).map((d) => [String(d._id), d]));
    return ids
      .map((id: any) => byId.get(String(id)))
      .filter(Boolean)
      .map((d: any) => normalizeContentItem(d, targetType));
  }

  return [];
}
