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
import { EditorialContent } from "@/models/EditorialContent";
import {
  DEFAULT_BLOCK_DISPLAY_CONFIG,
  DEFAULT_BLOCK_SOURCE_STYLES,
  isFeatureDisplay,
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

export interface ResolvedEditorial {
  eyebrow: string;
  body: string;
  image: string | null;
  secondaryImage: string | null;
  images: string[];
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
  editorial?: ResolvedEditorial;
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
/*                        Editorial source → resolved                         */
/* -------------------------------------------------------------------------- */

function buildItemsFromEditorial(
  blockId: string,
  display: string,
  editorial: { image: string | null; images: string[] },
  href: string,
): NormalizedContentItem[] {
  // Feature displays and the banner display render the editorial's story
  // directly — no items needed.
  if (isFeatureDisplay(display) || display === "banner") return [];

  // Standard card displays use the gallery.
  return editorial.images
    .filter((u) => u && u.trim().length > 0)
    .map((url, i) => ({
      _id: `${blockId}-editorial-${i}`,
      name: "",
      image: url,
      href: href || "#",
      contentType: "Page",
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

  /* ──────────────── EDITORIAL SOURCE ───────────────────────────── */
  if (source.type === "editorial") {
    if (!source.editorialId) return null;

    const doc: any = await EditorialContent.findById(source.editorialId).lean();
    if (!doc) return null;

    const editorial: ResolvedEditorial = {
      eyebrow: doc.eyebrow ?? "",
      body: doc.body ?? "",
      image: doc.image || null,
      secondaryImage: doc.secondaryImage || null,
      images: Array.isArray(doc.images)
        ? doc.images.filter(
            (u: any) => typeof u === "string" && u.trim().length > 0,
          )
        : [],
    };

    // Editorial owns headline + CTA — override block defaults.
    const editorialHeading: ResolvedHeading = {
      title: doc.heading?.title ?? "",
      subtitle: doc.heading?.subtitle ?? "",
      showHeading: true,
    };

    const editorialCta: ResolvedCta = {
      text: doc.cta?.text ?? "",
      link: doc.cta?.link ?? "",
      style: (doc.cta?.style ?? "none") as ResolvedCta["style"],
    };

    const items = buildItemsFromEditorial(
      blockMeta._id,
      blockMeta.display,
      editorial,
      editorialCta.link,
    );

    return {
      block: {
        ...blockMeta,
        heading: editorialHeading,
        cta: editorialCta,
      },
      items,
      editorial,
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
