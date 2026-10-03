// lib/content/resolve.ts
import mongoose from "mongoose";
import Product from "@/models/Product";
import Brand from "@/models/Brand";
import Category from "@/models/Category";
import Promotion from "@/models/Promotion";
import Page from "@/models/Page";
import { Collection } from "@/models/Collection";
import {
  getModelForTargetType,
  buildQueryFromRules,
  buildProductQueryFromScope,
  pickSlug,
  slugify,
} from "./query";
import {
  getTrendingItems,
  getRecommendations,
  getRecentlyViewed,
  getRelatedProducts,
} from "@/app/actions/events";
import type { IBlockSource, IBlockRef } from "@/models/ContentBlock";
import type { BlockRefModel } from "./constants";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export interface ResolveContext {
  /** For personalized / recentlyViewed recommendations. */
  userId?: string;
  /** For related blocks on product pages. */
  productId?: string;
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
  /** Optional secondary line (e.g. brand name, collection count). */
  subline?: string | null;
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
/*                            Normalizers                                     */
/* -------------------------------------------------------------------------- */

function normalizeProduct(doc: any): NormalizedContentItem {
  const slug = pickSlug(doc);
  return {
    _id: String(doc._id),
    name: doc.name || doc.title || "Untitled",
    image: Array.isArray(doc.images)
      ? (doc.images[0] ?? null)
      : doc.mainImage || doc.image || doc.imageUrl || null,
    href: buildHref("Product", String(doc._id), slug || null),
    contentType: "Product",
    price: doc.price ?? doc.salePrice ?? null,
    listPrice: doc.listPrice ?? null,
  };
}

function normalizeCategory(doc: any): NormalizedContentItem {
  const slug = pickSlug(doc);
  return {
    _id: String(doc._id),
    name: doc.name || "Untitled",
    image: doc.imageUrl || doc.image || null,
    description: doc.description ?? null,
    href: buildHref("Category", String(doc._id), slug || null),
    contentType: "Category",
  };
}

function normalizeCollection(doc: any): NormalizedContentItem {
  const slug = pickSlug(doc);
  return {
    _id: String(doc._id),
    name: doc.name || "Untitled",
    image: doc.imageUrl || doc.image || null,
    description: doc.description ?? null,
    href: buildHref("Collection", String(doc._id), slug || null),
    contentType: "Collection",
  };
}

function normalizeBrand(doc: any): NormalizedContentItem {
  const slug = pickSlug(doc);
  return {
    _id: String(doc._id),
    name: doc.name || "Untitled",
    image: doc.image || doc.imageUrl || doc.logo || null,
    href: buildHref("Brand", String(doc._id), slug || null),
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
  };
}

function normalizePage(doc: any): NormalizedContentItem {
  const slug = pickSlug(doc);
  return {
    _id: String(doc._id),
    name: doc.name || doc.title || "Untitled",
    image: doc.image || null,
    href: buildHref("Page", String(doc._id), slug || null, doc.url),
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

export async function resolveCollection(
  collectionId: string | mongoose.Types.ObjectId,
  ctx: ResolveContext = {},
  limitOverride?: number,
): Promise<NormalizedContentItem[]> {
  const collection: any = await Collection.findById(collectionId).lean();
  if (!collection || collection.status === "inactive") return [];

  const limit = limitOverride ?? collection.recommendationLimit ?? 20;

  /* ---- recommendation ---- */
  if (collection.type === "recommendation") {
    const kind = collection.recommendationType;
    let raw: any[] = [];
    switch (kind) {
      case "trending":
        raw = await getTrendingItems(limit);
        break;
      case "personalized":
        raw = ctx.userId ? await getRecommendations(limit) : [];
        break;
      case "recentlyViewed":
        raw = ctx.userId ? await getRecentlyViewed(limit) : [];
        break;
    }
    return raw.map((d) => normalizeProduct(d));
  }

  /* ---- related ---- */
  if (collection.type === "related") {
    if (!ctx.productId) return [];
    const raw = await getRelatedProducts(ctx.productId, limit);
    return raw.map((d) => normalizeProduct(d));
  }

  const targetType = collection.targetType as BlockRefModel;
  const Model = getModelForTargetType(targetType);
  if (!Model) return [];

  const m = Model as mongoose.Model<any>;

  /* ---- rule ---- */
  if (collection.type === "rule") {
    const query = buildQueryFromRules(collection.rules, targetType);
    if (Object.keys(query).length === 0) return [];
    const docs = await m.find(query).limit(limit).lean();
    return docs.map((d) => normalizeContentItem(d, targetType));
  }

  /* ---- manual ---- */
  if (collection.type === "manual") {
    const ids = (collection.items ?? []).slice(0, limit);
    const docs = await m.find({ _id: { $in: ids } }).lean();
    // Preserve admin-defined order
    const byId = new Map(docs.map((d: any) => [String(d._id), d]));
    return ids
      .map((id: any) => byId.get(String(id)))
      .filter(Boolean)
      .map((d: any) => normalizeContentItem(d, targetType));
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/*                            Promotion resolvers                             */
/* -------------------------------------------------------------------------- */

async function resolvePromotionSelf(
  promotionId: string | mongoose.Types.ObjectId,
): Promise<NormalizedContentItem[]> {
  const promo = await Promotion.findById(promotionId).lean();
  if (!promo) return [];
  return [normalizePromotion(promo)];
}

async function resolvePromotionProducts(
  promotionId: string | mongoose.Types.ObjectId,
  limit: number,
): Promise<NormalizedContentItem[]> {
  const promo: any = await Promotion.findById(promotionId).lean();
  if (!promo) return [];

  // Only surface products when the promotion is live right now.
  const now = new Date();
  const live =
    promo.isActive &&
    now >= new Date(promo.startDate) &&
    now <= new Date(promo.endDate);
  if (!live) return [];

  const query = buildProductQueryFromScope(promo.scope);
  const docs = await Product.find(query).limit(limit).lean();
  return docs.map((d) => normalizeProduct(d));
}

/* -------------------------------------------------------------------------- */
/*                            Recommendation resolver                         */
/* -------------------------------------------------------------------------- */

async function resolveRecommendation(
  kind: "trending" | "personalized" | "recentlyViewed",
  limit: number,
  ctx: ResolveContext,
): Promise<NormalizedContentItem[]> {
  switch (kind) {
    case "trending": {
      const raw = await getTrendingItems(limit);
      return raw.map((d) => normalizeProduct(d));
    }
    case "personalized": {
      if (!ctx.userId) return [];
      const raw = await getRecommendations(limit);
      return raw.map((d) => normalizeProduct(d));
    }
    case "recentlyViewed": {
      if (!ctx.userId) return [];
      const raw = await getRecentlyViewed(limit);
      return raw.map((d) => normalizeProduct(d));
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                              Manual refs resolver                          */
/* -------------------------------------------------------------------------- */

async function resolveManualRefs(
  refs: IBlockRef[],
): Promise<NormalizedContentItem[]> {
  if (!refs?.length) return [];

  // Group by refModel so we run one query per model instead of N.
  const byModel: Record<string, IBlockRef[]> = {};
  for (const r of refs) {
    (byModel[r.refModel] ??= []).push(r);
  }

  const out: NormalizedContentItem[] = [];

  await Promise.all(
    Object.entries(byModel).map(async ([modelName, items]) => {
      const Model = getModelForTargetType(modelName);
      if (!Model) return;

      const ids = items.map((r) => r.refId);
      const docs = await (Model as mongoose.Model<any>)
        .find({ _id: { $in: ids } })
        .lean();

      const byId = new Map(docs.map((d: any) => [String(d._id), d]));

      for (const ref of items) {
        const doc = byId.get(String(ref.refId));
        if (!doc) continue;

        const normalized = normalizeContentItem(doc, ref.refModel);

        // Apply overrides from the ref definition
        out.push({
          ...normalized,
          name: ref.label?.trim() || normalized.name,
          image: ref.image || normalized.image,
          description: ref.description || normalized.description,
        });
      }
    }),
  );

  // Restore the admin's ordering
  const orderMap = new Map(
    refs.map((r, i) => [`${r.refModel}:${String(r.refId)}`, r.order ?? i]),
  );
  out.sort((a, b) => {
    const ak = `${a.contentType}:${a._id}`;
    const bk = `${b.contentType}:${b._id}`;
    return (orderMap.get(ak) ?? 0) - (orderMap.get(bk) ?? 0);
  });

  return out;
}

/* -------------------------------------------------------------------------- */
/*                              Public dispatcher                             */
/* -------------------------------------------------------------------------- */

export async function resolveSource(
  source: IBlockSource,
  ctx: ResolveContext = {},
): Promise<NormalizedContentItem[]> {
  const limit = source.limit ?? 12;

  switch (source.type) {
    case "collection": {
      if (!source.collectionId) return [];
      return resolveCollection(source.collectionId, ctx, limit);
    }

    case "promotion": {
      if (!source.promotionId) return [];
      if (source.promotionMode === "self") {
        return resolvePromotionSelf(source.promotionId);
      }
      return resolvePromotionProducts(source.promotionId, limit);
    }

    case "recommendation": {
      if (!source.recommendationKind) return [];
      return resolveRecommendation(source.recommendationKind, limit, ctx);
    }

    case "related": {
      if (!ctx.productId) return [];
      if (
        source.relatedStrategy === "collection" &&
        source.relatedCollectionId
      ) {
        return resolveCollection(source.relatedCollectionId, ctx, limit);
      }
      const raw = await getRelatedProducts(ctx.productId, limit);
      return raw.map((d) => normalizeProduct(d));
    }

    case "manual": {
      return resolveManualRefs(source.refs ?? []);
    }

    default:
      return [];
  }
}
