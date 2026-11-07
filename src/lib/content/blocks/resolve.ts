// lib/content/blocks/resolve.ts
import mongoose from "mongoose";
import {
  resolveCollection,
  normalizeContentItem,
  type NormalizedContentItem,
} from "@/lib/content/resolve";
import { getEntityConfig } from "@/lib/content/entityRegistry";
import { buildProductQueryFromScope } from "@/lib/content/query";
import Product from "@/models/Product";
import {
  DEFAULT_BLOCK_DISPLAY_CONFIG,
  DEFAULT_BLOCK_SOURCE_STYLES,
  type BlockAnimation,
  type BlockAlignment,
  type BlockLocation,
  type BlockSourceStyles,
  type CardShape,
  type BlockTheme,
} from "@/lib/content/constants";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export interface ResolveCtx {
  userId?: string;
}

export interface ResolvedHeading {
  title: string;
  subtitle: string;
  showHeading: boolean;
}

export interface ResolvedCta {
  text: string;
  link: string;
  style: "none" | "link" | "button";
}

/** Superset of DEFAULT_BLOCK_DISPLAY_CONFIG that includes `columns`. */
export interface ResolvedDisplayConfig {
  theme: BlockTheme;
  columns: number;
  gap: number;
  borderless: boolean;
  rounded: boolean;
  shadow: boolean;
  alignment: BlockAlignment;
  animation: BlockAnimation;
  cardShape: CardShape;
}

export type ResolvedSourceStyles = BlockSourceStyles;

export interface ResolvedBlock {
  block: {
    _id: string;
    name: string;
    location: BlockLocation;
    display: string;
    heading: ResolvedHeading;
    displayConfig: ResolvedDisplayConfig;
    sourceStyles: ResolvedSourceStyles;
    cta: ResolvedCta;
    limit: number;
  };
  items: NormalizedContentItem[];
}

/* -------------------------------------------------------------------------- */
/*                                    Defaults                                */
/* -------------------------------------------------------------------------- */

const DEFAULT_DISPLAY: ResolvedDisplayConfig = {
  ...DEFAULT_BLOCK_DISPLAY_CONFIG,
  columns: 4,
};

/* -------------------------------------------------------------------------- */
/*                             Source resolvers                               */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a manual `{ refModel, refId }[]` list. Groups by model so we issue
 * one query per distinct model, then re-orders to match the authored order.
 */
async function resolveManualSource(
  source: any,
  limit: number,
): Promise<NormalizedContentItem[]> {
  const raw: { refModel: string; refId: string }[] = Array.isArray(source.items)
    ? source.items
    : [];
  if (raw.length === 0) return [];

  // Group ids by model for batched fetches.
  const grouped = new Map<string, string[]>();
  for (const it of raw) {
    if (!it?.refModel || !it?.refId) continue;
    const list = grouped.get(it.refModel) ?? [];
    list.push(String(it.refId));
    grouped.set(it.refModel, list);
  }

  const cache = new Map<string, any>();
  await Promise.all(
    [...grouped].map(async ([refModel, ids]) => {
      const cfg = getEntityConfig(refModel);
      if (!cfg) return;
      const docs = await cfg.model
        .find({
          _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
        })
        .lean();
      for (const d of docs as any[]) {
        cache.set(`${refModel}:${String(d._id)}`, d);
      }
    }),
  );

  const out: NormalizedContentItem[] = [];
  for (const it of raw.slice(0, limit)) {
    const doc = cache.get(`${it.refModel}:${String(it.refId)}`);
    if (doc) out.push(normalizeContentItem(doc, it.refModel as any));
  }
  return out;
}

/**
 * Category source: return products that belong to the category.
 * For "category tile" blocks use a Collection with targetType=Category.
 */
async function resolveCategorySource(
  source: any,
  limit: number,
): Promise<NormalizedContentItem[]> {
  if (!source.categoryId) return [];
  const docs = await Product.find({
    categoryId: {
      $in: [new mongoose.Types.ObjectId(String(source.categoryId))],
    },
  })
    .limit(limit)
    .lean();
  return (docs as any[]).map((d) => normalizeContentItem(d, "Product"));
}

/**
 * Promotion source:
 *   - "products" → every product in the promotion's scope
 *   - "self"     → the promotion tile itself (banner-friendly, keeps imageUrl)
 */
async function resolvePromotionSource(
  source: any,
  limit: number,
): Promise<NormalizedContentItem[]> {
  if (!source.promotionId) return [];
  const cfg = getEntityConfig("Promotion");
  if (!cfg) return [];

  const promo: any = await cfg.model.findById(source.promotionId).lean();
  if (!promo) return [];

  if (source.promotionMode === "self") {
    const item = normalizeContentItem(promo, "Promotion");
    // Promotions store their own imageUrl; expose it so a banner display
    // has something to paint.
    if (!item.image) item.image = promo.imageUrl ?? null;
    return [item];
  }

  const query = buildProductQueryFromScope(promo.scope);
  const docs = await Product.find(query).limit(limit).lean();
  return (docs as any[]).map((d) => normalizeContentItem(d, "Product"));
}

/* -------------------------------------------------------------------------- */
/*                                 resolveBlock                               */
/* -------------------------------------------------------------------------- */

/**
 * Turn one raw `Block` document into a storefront-ready payload.
 * Returns `null` for inactive blocks or unknown source types.
 */
export async function resolveBlock(
  raw: any,
  ctx: ResolveCtx = {},
): Promise<ResolvedBlock | null> {
  if (!raw || raw.status !== "active") return null;

  const limit = Math.min(Number(raw.limit) || 12, 60);
  const source = raw.source ?? {};
  let items: NormalizedContentItem[] = [];

  switch (source.type) {
    case "collection":
      if (source.collectionId) {
        items = await resolveCollection(
          source.collectionId,
          { userId: ctx.userId },
          limit,
        );
      }
      break;

    case "category":
      items = await resolveCategorySource(source, limit);
      break;

    case "promotion":
      items = await resolvePromotionSource(source, limit);
      break;

    case "manual":
      items = await resolveManualSource(source, limit);
      break;

    default:
      return null;
  }

  const heading: ResolvedHeading = {
    title: raw.heading?.title ?? "",
    subtitle: raw.heading?.subtitle ?? "",
    showHeading: raw.heading?.showHeading !== false,
  };

  const displayConfig: ResolvedDisplayConfig = {
    ...DEFAULT_DISPLAY,
    ...(raw.displayConfig ?? {}),
  };

  const sourceStyles: ResolvedSourceStyles = {
    ...DEFAULT_BLOCK_SOURCE_STYLES,
    ...(raw.sourceStyles ?? {}),
  };

  const cta: ResolvedCta = {
    text: raw.cta?.text ?? "",
    link: raw.cta?.link ?? "",
    style: (raw.cta?.style ?? "none") as ResolvedCta["style"],
  };

  return {
    block: {
      _id: String(raw._id),
      name: raw.name ?? "",
      location: raw.location,
      display: raw.display ?? "grid",
      heading,
      displayConfig,
      sourceStyles,
      cta,
      limit,
    },
    items,
  };
}
