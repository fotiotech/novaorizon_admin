// app/actions/contentBlock.ts
"use server";

import mongoose from "mongoose";
import { revalidatePath, revalidateTag } from "next/cache";
import { connection } from "@/utils/connection";
import { ContentBlock } from "@/models/ContentBlock";
import { Collection } from "@/models/Collection";
import Promotion from "@/models/Promotion";
import { deleteS3Object } from "./s3";
import { getModelForTargetType } from "@/lib/content/query";
import {
  resolveSource,
  type NormalizedContentItem,
  type ResolveContext,
} from "@/lib/content/resolve";
import {
  BLOCK_LOCATIONS,
  BLOCK_DISPLAYS,
  BLOCK_SOURCE_TYPES,
  RECOMMENDATION_KINDS,
  PROMOTION_MODES,
  BLOCK_REF_MODELS,
  BLOCK_COLUMN_COUNTS,
  BLOCK_THEMES,
  BLOCK_ANIMATIONS,
  BLOCK_ALIGNMENTS,
  CTA_STYLES,
  DEFAULT_BLOCK_DISPLAY_CONFIG,
  DEFAULT_BLOCK_LIMIT,
  MAX_BLOCK_LIMIT,
} from "@/lib/content/constants";

const BLOCKS_LIST_PATH = "/marketing/content/blocks";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

export interface ResolvedBlock {
  _id: string;
  name: string;
  sectionTitle?: string;
  location: string;
  order: number;
  visible: boolean;
  display: string;
  columns: number;
  showImages: boolean;
  displayConfig: any;
  ctaText?: string;
  ctaLink?: string;
  ctaStyle?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  items: NormalizedContentItem[];
}

export interface BlockRefOption {
  id: string;
  name: string;
  sublabel?: string;
}

export interface BlockOptions {
  collections: BlockRefOption[];
  promotions: BlockRefOption[];
  /** Per-model options for the manual refs editor. */
  refOptions: Record<string, BlockRefOption[]>;
}

/* -------------------------------------------------------------------------- */
/*                             Revalidation                                   */
/* -------------------------------------------------------------------------- */

function revalidateBlockConsumers() {
  revalidatePath(BLOCKS_LIST_PATH);
  revalidateTag("content-blocks", "max");
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------------- */
/*                             Reference options                              */
/* -------------------------------------------------------------------------- */

/**
 * Models the manual refs picker can point at. Kept in sync with
 * BLOCK_REF_MODELS from lib/content/constants.
 */
const REF_MODELS_FOR_BLOCKS = [
  "Category",
  "Product",
  "Collection",
  "Brand",
  "Promotion",
  "Page",
] as const;

async function fetchRefOptionsForModel(
  modelName: string,
): Promise<BlockRefOption[]> {
  const Model = getModelForTargetType(modelName);
  if (!Model) return [];

  const docs = await (Model as mongoose.Model<any>)
    .find({}, { name: 1 })
    .sort({ name: 1 })
    .limit(500)
    .lean();

  return docs.map((d: any) => ({
    id: String(d._id),
    name: d.name ?? d.title ?? "Untitled",
  }));
}

export async function getBlockOptions(): Promise<ActionResult<BlockOptions>> {
  try {
    await connection();

    const [collections, promotions, ...refBuckets] = await Promise.all([
      Collection.find({ status: "active" }, { name: 1, targetType: 1, type: 1 })
        .sort({ name: 1 })
        .limit(500)
        .lean(),
      Promotion.find(
        { isActive: true },
        { name: 1, code: 1, startDate: 1, endDate: 1 },
      )
        .sort({ startDate: -1 })
        .limit(500)
        .lean(),
      ...REF_MODELS_FOR_BLOCKS.map((m) => fetchRefOptionsForModel(m)),
    ]);

    const refOptions: Record<string, BlockRefOption[]> = {};
    REF_MODELS_FOR_BLOCKS.forEach((m, i) => {
      refOptions[m] = refBuckets[i] as BlockRefOption[];
    });

    return {
      success: true,
      data: {
        collections: collections.map((c: any) => ({
          id: String(c._id),
          name: c.name ?? "Untitled",
          sublabel: `${c.type} · ${c.targetType ?? "Product"}`,
        })),
        promotions: promotions.map((p: any) => ({
          id: String(p._id),
          name: p.name ?? "Untitled",
          sublabel: p.code ?? undefined,
        })),
        refOptions,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                                Read actions                                */
/* -------------------------------------------------------------------------- */

export async function getBlocksByLocation(
  location: string,
  ctx: ResolveContext = {},
): Promise<ActionResult<ResolvedBlock[]>> {
  try {
    await connection();
    const blocks = await ContentBlock.find({
      location,
      visible: { $ne: false },
    })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      blocks.map(async (block) => {
        const items = await resolveSource(block.source as any, ctx);
        return {
          _id: String(block._id),
          name: block.name,
          sectionTitle: block.sectionTitle ?? undefined,
          location: block.location,
          order: block.order,
          visible: block.visible,
          display: block.display,
          columns: block.columns,
          showImages: block.showImages,
          displayConfig: block.displayConfig,
          ctaText: block.ctaText ?? undefined,
          ctaLink: block.ctaLink ?? undefined,
          ctaStyle: block.ctaStyle ?? undefined,
          backgroundColor: block.backgroundColor ?? undefined,
          backgroundImage: block.backgroundImage ?? undefined,
          items,
        };
      }),
    );

    return { success: true, data: JSON.parse(JSON.stringify(enriched)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBlockById(id: string): Promise<ActionResult<any>> {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid block ID" };
    }
    const block = await ContentBlock.findById(id).lean();
    if (!block) return { success: false, error: "Block not found" };
    return { success: true, data: JSON.parse(JSON.stringify(block)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllBlocks(): Promise<ActionResult<any[]>> {
  try {
    await connection();
    const blocks = await ContentBlock.find().sort({ createdAt: -1 }).lean();
    return { success: true, data: JSON.parse(JSON.stringify(blocks)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Validation                                 */
/* -------------------------------------------------------------------------- */

function validateBlockData(data: any): string | null {
  if (!data?.name?.trim()) return "Name is required";
  if (!BLOCK_LOCATIONS.includes(data.location)) return "Invalid location";
  if (!BLOCK_DISPLAYS.includes(data.display)) return "Invalid display";
  if (!data.source?.type) return "Source type is required";
  if (!BLOCK_SOURCE_TYPES.includes(data.source.type)) {
    return "Invalid source type";
  }

  const s = data.source;
  switch (s.type) {
    case "collection":
      if (!s.collectionId || !mongoose.Types.ObjectId.isValid(s.collectionId)) {
        return "A valid collection is required";
      }
      break;
    case "promotion":
      if (!s.promotionId || !mongoose.Types.ObjectId.isValid(s.promotionId)) {
        return "A valid promotion is required";
      }
      if (!PROMOTION_MODES.includes(s.promotionMode)) {
        return "Invalid promotion mode";
      }
      break;
    case "recommendation":
      if (!RECOMMENDATION_KINDS.includes(s.recommendationKind)) {
        return "Invalid recommendation kind";
      }
      break;
    case "related":
      if (
        s.relatedStrategy === "collection" &&
        (!s.relatedCollectionId ||
          !mongoose.Types.ObjectId.isValid(s.relatedCollectionId))
      ) {
        return "A valid related collection is required";
      }
      break;
    case "manual":
      if (!Array.isArray(s.refs) || s.refs.length === 0) {
        return "At least one ref is required for manual sources";
      }
      for (const r of s.refs) {
        if (!BLOCK_REF_MODELS.includes(r.refModel)) {
          return `Invalid ref model: ${r.refModel}`;
        }
        if (!mongoose.Types.ObjectId.isValid(r.refId)) {
          return `Invalid ref id: ${r.refId}`;
        }
      }
      break;
  }

  if (s.limit != null) {
    const n = Number(s.limit);
    if (!Number.isInteger(n) || n < 1 || n > MAX_BLOCK_LIMIT) {
      return `Limit must be 1–${MAX_BLOCK_LIMIT}`;
    }
  }

  if (
    data.columns != null &&
    !BLOCK_COLUMN_COUNTS.includes(Number(data.columns) as any)
  ) {
    return "Invalid columns";
  }

  const dc = data.displayConfig;
  if (dc) {
    if (dc.theme && !BLOCK_THEMES.includes(dc.theme)) return "Invalid theme";
    if (dc.animation && !BLOCK_ANIMATIONS.includes(dc.animation)) {
      return "Invalid animation";
    }
    if (dc.alignment && !BLOCK_ALIGNMENTS.includes(dc.alignment)) {
      return "Invalid alignment";
    }
    if (dc.gap != null) {
      const n = Number(dc.gap);
      if (isNaN(n) || n < 0 || n > 64) return "Gap must be 0–64";
    }
  }

  if (data.ctaStyle && !CTA_STYLES.includes(data.ctaStyle)) {
    return "Invalid CTA style";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                              Update builder                                */
/* -------------------------------------------------------------------------- */

function sanitizeSource(source: any) {
  const out: any = {
    type: source.type,
    limit: source.limit ?? DEFAULT_BLOCK_LIMIT,
  };

  switch (source.type) {
    case "collection":
      out.collectionId = source.collectionId || null;
      break;
    case "promotion":
      out.promotionId = source.promotionId || null;
      out.promotionMode = source.promotionMode || "products";
      break;
    case "recommendation":
      out.recommendationKind = source.recommendationKind || null;
      break;
    case "related":
      out.relatedStrategy = source.relatedStrategy || "auto";
      out.relatedCollectionId = source.relatedCollectionId || null;
      break;
    case "manual":
      out.refs = (source.refs ?? []).map((r: any, i: number) => ({
        _id:
          r._id && mongoose.Types.ObjectId.isValid(r._id) ? r._id : undefined,
        refId: r.refId,
        refModel: r.refModel,
        label: r.label ?? null,
        image: r.image ?? null,
        description: r.description ?? null,
        order: typeof r.order === "number" ? r.order : i,
      }));
      break;
  }

  return out;
}

function buildBlockUpdates(data: any) {
  return {
    name: data.name.trim(),
    description: data.description?.trim() || null,
    location: data.location,
    sectionTitle: data.sectionTitle?.trim() || null,
    order: Number(data.order) || 0,
    visible: data.visible !== false,
    source: sanitizeSource(data.source),
    display: data.display,
    columns: Number(data.columns) || 4,
    showImages: data.showImages !== false,
    displayConfig: {
      ...DEFAULT_BLOCK_DISPLAY_CONFIG,
      ...(data.displayConfig ?? {}),
    },
    ctaText: data.ctaText?.trim() || null,
    ctaLink: data.ctaLink?.trim() || null,
    ctaStyle: data.ctaStyle || "link",
    backgroundColor: data.backgroundColor || null,
    backgroundImage: data.backgroundImage || null,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 Mutations                                  */
/* -------------------------------------------------------------------------- */

export async function createBlock(data: any): Promise<ActionResult<any>> {
  try {
    await connection();

    const err = validateBlockData(data);
    if (err) return { success: false, error: err };

    const existing = await ContentBlock.findOne({ name: data.name.trim() });
    if (existing) {
      return { success: false, error: "A block with this name already exists" };
    }

    const block = await ContentBlock.create(buildBlockUpdates(data));
    revalidateBlockConsumers();
    return {
      success: true,
      data: JSON.parse(JSON.stringify(block)),
      message: "Block created successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBlock(
  id: string,
  data: any,
): Promise<ActionResult<any>> {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid block ID" };
    }

    const err = validateBlockData(data);
    if (err) return { success: false, error: err };

    const current = await ContentBlock.findById(id);
    if (!current) return { success: false, error: "Block not found" };

    const dup = await ContentBlock.findOne({
      _id: { $ne: current._id },
      name: data.name.trim(),
    });
    if (dup) {
      return {
        success: false,
        error: "Another block with this name already exists",
      };
    }

    const oldBackground = current.backgroundImage;

    Object.assign(current, buildBlockUpdates(data));
    await current.save();

    if (oldBackground && oldBackground !== current.backgroundImage) {
      try {
        await deleteS3Object(oldBackground);
      } catch (err) {
        console.error("Failed to delete old block background:", err);
      }
    }

    revalidateBlockConsumers();
    revalidatePath(`${BLOCKS_LIST_PATH}/edit/${id}`);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(current)),
      message: "Block updated successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBlock(id: string): Promise<ActionResult<null>> {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid block ID" };
    }

    const block = await ContentBlock.findById(id);
    if (!block) return { success: false, error: "Block not found" };

    if (block.backgroundImage) {
      try {
        await deleteS3Object(block.backgroundImage);
      } catch (err) {
        console.error("Failed to delete block background:", err);
      }
    }

    await ContentBlock.findByIdAndDelete(id);
    revalidateBlockConsumers();
    return {
      success: true,
      data: null,
      message: "Block deleted successfully",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBlockBackgroundImage(
  blockId: string,
): Promise<ActionResult<null>> {
  try {
    await connection();
    if (!mongoose.Types.ObjectId.isValid(blockId)) {
      return { success: false, error: "Invalid block ID" };
    }
    const block = await ContentBlock.findById(blockId);
    if (!block) return { success: false, error: "Block not found" };
    if (!block.backgroundImage) {
      return { success: false, error: "No background image to delete" };
    }
    await deleteS3Object(block.backgroundImage);
    block.backgroundImage = "";
    await block.save();
    revalidateBlockConsumers();
    return { success: true, data: null, message: "Background image removed" };
  } catch (error: any) {
    return { success: false, error: "Failed to delete image" };
  }
}
