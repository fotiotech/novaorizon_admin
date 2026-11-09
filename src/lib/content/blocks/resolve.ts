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
import { BannerContent } from "@/models/BannerContent";
import {
  DEFAULT_BLOCK_DISPLAY_CONFIG,
  DEFAULT_BLOCK_SOURCE_STYLES,
  type BlockAnimation,
  type BlockAlignment,
  type BlockLocation,
  type BlockSourceStyles,
  type BlockTheme,
  type CardShape,
  type CardRatio,
  type CardSize,
  type TitlePosition,
  type ImagePosition,
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
  cardRatio: CardRatio;
  cardSize: CardSize;
  titlePosition: TitlePosition;
  imagePosition: ImagePosition;
  backgroundColor: string;
  textColor: string;
}

export type ResolvedSourceStyles = BlockSourceStyles;

export interface ResolvedBanner {
  _id: string;
  name: string;
  eyebrow: string;
  body: string;
  heading: { title: string; subtitle: string };
  image: string | null;
  cta: ResolvedCta;
}

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
  /** Present only when the source is a banner. Ordered per source.bannerIds. */
  banners?: ResolvedBanner[];
}

/* -------------------------------------------------------------------------- */
/*                                    Defaults                                */
/* -------------------------------------------------------------------------- */

const DEFAULT_DISPLAY: ResolvedDisplayConfig = {
  ...DEFAULT_BLOCK_DISPLAY_CONFIG,
};

/* -------------------------------------------------------------------------- */
/*                             Source resolvers                               */
/* -------------------------------------------------------------------------- */

async function resolveManualSource(
  source: any,
  limit: number,
): Promise<NormalizedContentItem[]> {
  const raw: { refModel: string; refId: string }[] = Array.isArray(source.items)
    ? source.items
    : [];
  if (raw.length === 0) return [];

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
    if (!item.image) item.image = promo.imageUrl ?? null;
    return [item];
  }

  const query = buildProductQueryFromScope(promo.scope);
  const docs = await Product.find(query).limit(limit).lean();
  return (docs as any[]).map((d) => normalizeContentItem(d, "Product"));
}

/* -------------------------------------------------------------------------- */
/*                        Banner source → resolved                            */
/* -------------------------------------------------------------------------- */

async function resolveBanners(bannerIds: any[]): Promise<ResolvedBanner[]> {
  if (!bannerIds || bannerIds.length === 0) return [];

  // Validate IDs before querying so a corrupted doc can't crash Mongo.
  const validIds = bannerIds
    .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => new mongoose.Types.ObjectId(String(id)));

  if (validIds.length === 0) return [];

  const docs: any[] = await BannerContent.find({
    _id: { $in: validIds },
  }).lean();

  // Preserve the authored order.
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  const out: ResolvedBanner[] = [];
  for (const id of validIds) {
    const d = byId.get(String(id));
    if (!d) continue;
    out.push({
      _id: String(d._id),
      name: d.name ?? "",
      eyebrow: d.eyebrow ?? "",
      body: d.body ?? "",
      heading: {
        title: d.heading?.title ?? "",
        subtitle: d.heading?.subtitle ?? "",
      },
      image: d.image || null,
      cta: {
        text: d.cta?.text ?? "",
        link: d.cta?.link ?? "",
        style: (d.cta?.style ?? "none") as ResolvedCta["style"],
      },
    });
  }
  return out;
}

/**
 * A block's `items` for banner source is one item per banner. Card
 * layouts use this; the banner display reads `banners` directly.
 */
function buildItemsFromBanners(
  blockId: string,
  banners: ResolvedBanner[],
): NormalizedContentItem[] {
  return banners.map((b, i) => ({
    _id: `${blockId}-banner-${i}-${b._id}`,
    name: b.heading.title || b.name,
    image: b.image,
    description: b.body || null,
    href: b.cta.link || "#",
    contentType: "Page",
    badge: b.eyebrow || null,
  }));
}

/* -------------------------------------------------------------------------- */
/*                                 resolveBlock                               */
/* -------------------------------------------------------------------------- */

export async function resolveBlock(
  raw: any,
  ctx: ResolveCtx = {},
): Promise<ResolvedBlock | null> {
  if (!raw || raw.status !== "active") return null;

  const displayConfig: ResolvedDisplayConfig = {
    ...DEFAULT_DISPLAY,
    ...(raw.displayConfig ?? {}),
  };

  const sourceStyles: ResolvedSourceStyles = {
    ...DEFAULT_BLOCK_SOURCE_STYLES,
    ...(raw.sourceStyles ?? {}),
  };

  const heading: ResolvedHeading = {
    title: raw.heading?.title ?? "",
    subtitle: raw.heading?.subtitle ?? "",
    showHeading: raw.heading?.showHeading !== false,
  };

  const cta: ResolvedCta = {
    text: raw.cta?.text ?? "",
    link: raw.cta?.link ?? "",
    style: (raw.cta?.style ?? "none") as ResolvedCta["style"],
  };

  const blockMeta = {
    _id: String(raw._id),
    name: raw.name ?? "",
    location: raw.location,
    display: raw.display ?? "grid",
    heading,
    displayConfig,
    sourceStyles,
    cta,
    limit: Math.min(Number(raw.limit) || 12, 60),
  };

  const source = raw.source ?? {};

  /* ──────────────── BANNER SOURCE ───────────────────────────────── */
  if (source.type === "banner") {
    const banners = await resolveBanners(source.bannerIds ?? []);
    if (banners.length === 0) return null;

    // Block-level heading and CTA are not used for banner source.
    // Each banner carries its own.
    const items = buildItemsFromBanners(blockMeta._id, banners);

    return {
      block: {
        ...blockMeta,
        heading: { title: "", subtitle: "", showHeading: false },
        cta: { text: "", link: "", style: "none" },
      },
      items,
      banners,
    };
  }

  /* ──────────────── OTHER SOURCES ──────────────────────────────── */
  let items: NormalizedContentItem[] = [];
  const limit = blockMeta.limit;

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

  return { block: blockMeta, items };
}
