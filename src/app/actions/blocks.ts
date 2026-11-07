// app/actions/blocks.ts
"use server";
import { requireAdmin } from "@/lib/authz";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { Block } from "@/models/Block";
import { Collection } from "@/models/Collection";
import Category from "@/models/Category";
import Promotion from "@/models/Promotion";
import {
  BLOCK_LOCATIONS,
  BLOCK_DISPLAYS,
  BLOCK_SOURCE_TYPES,
  PROMOTION_MODES,
  BLOCK_REF_MODELS,
  BLOCK_THEMES,
  BLOCK_ANIMATIONS,
  BLOCK_ALIGNMENTS,
  CTA_STYLES,
  CARD_SHAPES,
  MAX_BLOCK_LIMIT,
  type BlockLocation,
} from "@/lib/content/constants";

const LIST_PATH = "/channels/store/content/blocks";

// Local extension until constants.ts is updated in batch 2.
const DISPLAYS = [...BLOCK_DISPLAYS, "banner"] as const;

/* -------------------------------------------------------------------------- */
/*                                  helpers                                   */
/* -------------------------------------------------------------------------- */

function pickEnum<T extends readonly string[]>(
  raw: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  const s = String(raw ?? "");
  return (allowed as readonly string[]).includes(s)
    ? (s as T[number])
    : fallback;
}

function readBool(fd: FormData, key: string, dflt = false): boolean {
  const v = fd.get(key);
  if (v === null) return dflt;
  const s = String(v);
  return s === "true" || s === "on" || s === "1";
}

function readNum(fd: FormData, key: string, dflt: number): number {
  const n = Number(fd.get(key));
  return Number.isFinite(n) ? n : dflt;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function revalidateBlocks(location: BlockLocation) {
  revalidatePath("/");
  revalidatePath("/products/[slug]", "page");
  revalidatePath(LIST_PATH);
  updateTag("blocks");
  updateTag(`blocks:${location}`);
}

/* -------------------------------------------------------------------------- */
/*                            Source preview                                  */
/* -------------------------------------------------------------------------- */

export interface SourcePreviewData {
  _id: string;
  name: string;
  imageUrl: string | null;
  meta: Record<string, any>;
}

export type SourcePreviewResult =
  | { success: true; data: SourcePreviewData }
  | { success: false; error: string; missing?: boolean };

/**
 * Resolve a small preview payload for a block's source selection so the
 * admin form can render a rich "selected" card instead of just a name.
 * Returns `missing: true` when the referenced item was deleted — the form
 * shows a warning instead of an endless spinner.
 */
export async function getSourcePreview(
  sourceType: string,
  id: string,
): Promise<SourcePreviewResult> {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, error: "Invalid ID" };
  }
  await connection();

  try {
    if (sourceType === "collection") {
      const doc: any = await Collection.findById(id)
        .select("name imageUrl type targetType status")
        .lean();
      if (!doc) return { success: false, error: "Not found", missing: true };
      return {
        success: true,
        data: {
          _id: String(doc._id),
          name: doc.name,
          imageUrl: doc.imageUrl ?? null,
          meta: {
            type: doc.type,
            targetType: doc.targetType,
            status: doc.status,
          },
        },
      };
    }

    if (sourceType === "category") {
      const doc: any = await Category.findById(id)
        .select("name imageUrl slug status")
        .lean();
      if (!doc) return { success: false, error: "Not found", missing: true };
      const img = Array.isArray(doc.imageUrl)
        ? (doc.imageUrl[0] ?? null)
        : (doc.imageUrl ?? null);
      return {
        success: true,
        data: {
          _id: String(doc._id),
          name: doc.name,
          imageUrl: img,
          meta: {
            slug: doc.slug,
            status: doc.status,
          },
        },
      };
    }

    if (sourceType === "promotion") {
      const doc: any = await Promotion.findById(id)
        .select(
          "name imageUrl code isActive startDate endDate promotionType.calculationType",
        )
        .lean();
      if (!doc) return { success: false, error: "Not found", missing: true };
      return {
        success: true,
        data: {
          _id: String(doc._id),
          name: doc.name,
          imageUrl: doc.imageUrl ?? null,
          meta: {
            code: doc.code ?? null,
            isActive: doc.isActive !== false,
            startDate: doc.startDate ?? null,
            endDate: doc.endDate ?? null,
            calculationType: doc.promotionType?.calculationType ?? null,
          },
        },
      };
    }

    return { success: false, error: "Unsupported source type" };
  } catch (err) {
    console.error("[getSourcePreview]", err);
    return { success: false, error: "Failed to load preview" };
  }
}
/* -------------------------------------------------------------------------- */
/*                             form parsing                                   */
/* -------------------------------------------------------------------------- */

type ParseOk = { doc: Record<string, any> };
type ParseErr = { error: string };

function parseBlockForm(fd: FormData): ParseOk | ParseErr {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  const location = pickEnum(
    fd.get("location"),
    BLOCK_LOCATIONS,
    "Home" as BlockLocation,
  );
  const display = pickEnum(fd.get("display"), DISPLAYS, "grid");
  const sourceType = pickEnum(
    fd.get("source.type"),
    BLOCK_SOURCE_TYPES,
    "collection",
  );

  const source: any = { type: sourceType };

  if (sourceType === "collection") {
    const id = String(fd.get("source.collectionId") ?? "");
    if (!mongoose.Types.ObjectId.isValid(id))
      return { error: "Select a collection" };
    source.collectionId = new mongoose.Types.ObjectId(id);
  } else if (sourceType === "category") {
    const id = String(fd.get("source.categoryId") ?? "");
    if (!mongoose.Types.ObjectId.isValid(id))
      return { error: "Select a category" };
    source.categoryId = new mongoose.Types.ObjectId(id);
  } else if (sourceType === "promotion") {
    const id = String(fd.get("source.promotionId") ?? "");
    if (!mongoose.Types.ObjectId.isValid(id))
      return { error: "Select a promotion" };
    source.promotionId = new mongoose.Types.ObjectId(id);
    source.promotionMode = pickEnum(
      fd.get("source.promotionMode"),
      PROMOTION_MODES,
      "products",
    );
  } else if (sourceType === "manual") {
    let raw: any[] = [];
    try {
      raw = JSON.parse(String(fd.get("source.items") ?? "[]"));
    } catch {
      return { error: "Invalid manual items" };
    }
    if (!Array.isArray(raw)) return { error: "Manual items must be an array" };

    const items = raw
      .filter(
        (i) =>
          i &&
          typeof i.refModel === "string" &&
          i.refId &&
          (BLOCK_REF_MODELS as readonly string[]).includes(i.refModel) &&
          mongoose.Types.ObjectId.isValid(i.refId),
      )
      .slice(0, 50)
      .map((i) => ({
        refModel: i.refModel,
        refId: new mongoose.Types.ObjectId(i.refId),
      }));

    if (items.length === 0)
      return { error: "Add at least one item for a manual block" };
    source.items = items;
  }

  const doc: Record<string, any> = {
    name,
    location,
    display,
    source,
    heading: {
      title: String(fd.get("heading.title") ?? "").trim(),
      subtitle: String(fd.get("heading.subtitle") ?? "").trim(),
      showHeading: readBool(fd, "heading.showHeading", true),
    },
    displayConfig: {
      theme: pickEnum(fd.get("displayConfig.theme"), BLOCK_THEMES, "inherit"),
      columns: clamp(readNum(fd, "displayConfig.columns", 4), 1, 6),
      gap: clamp(readNum(fd, "displayConfig.gap", 16), 0, 64),
      borderless: readBool(fd, "displayConfig.borderless"),
      rounded: readBool(fd, "displayConfig.rounded", true),
      shadow: readBool(fd, "displayConfig.shadow"),
      alignment: pickEnum(
        fd.get("displayConfig.alignment"),
        BLOCK_ALIGNMENTS,
        "start",
      ),
      animation: pickEnum(
        fd.get("displayConfig.animation"),
        BLOCK_ANIMATIONS,
        "fade",
      ),
      cardShape: pickEnum(
        fd.get("displayConfig.cardShape"),
        CARD_SHAPES,
        "default",
      ),
    },
    sourceStyles: {
      promotionBadgeStyle: String(
        fd.get("sourceStyles.promotionBadgeStyle") ?? "default",
      ),
      promotionShowCode: readBool(fd, "sourceStyles.promotionShowCode", true),
      collectionShowItemCount: readBool(
        fd,
        "sourceStyles.collectionShowItemCount",
      ),
      collectionCountPosition: String(
        fd.get("sourceStyles.collectionCountPosition") ?? "subline",
      ),
      manualCardSize: String(fd.get("sourceStyles.manualCardSize") ?? "md"),
      manualCardVariant: String(
        fd.get("sourceStyles.manualCardVariant") ?? "card",
      ),
      manualShowDescription: readBool(
        fd,
        "sourceStyles.manualShowDescription",
        true,
      ),
    },
    cta: {
      text: String(fd.get("cta.text") ?? "").trim(),
      link: String(fd.get("cta.link") ?? "").trim(),
      style: pickEnum(fd.get("cta.style"), CTA_STYLES, "none"),
    },
    limit: clamp(readNum(fd, "limit", 12), 1, MAX_BLOCK_LIMIT),
    status: pickEnum(
      fd.get("status"),
      ["active", "inactive"] as const,
      "active",
    ),
    order: Math.max(0, readNum(fd, "order", 0)),
  };

  if (doc.cta.style !== "none" && (!doc.cta.text || !doc.cta.link)) {
    return { error: "CTA requires both text and link" };
  }

  return { doc };
}

/* -------------------------------------------------------------------------- */
/*                                  reads                                     */
/* -------------------------------------------------------------------------- */

export async function getAllBlocks(location?: BlockLocation) {
  await requireAdmin();
  try {
    await connection();
    const filter: Record<string, any> = {};
    if (location) filter.location = location;
    const docs = await Block.find(filter)
      .sort({ location: 1, order: 1, created_at: -1 })
      .lean();
    return { success: true, data: JSON.parse(JSON.stringify(docs)) };
  } catch (err: any) {
    console.error("[getAllBlocks]", err);
    return { success: false, error: err?.message ?? "Failed to load blocks" };
  }
}

export async function getBlockById(id: string) {
  await requireAdmin();
  try {
    if (!mongoose.Types.ObjectId.isValid(id))
      return { success: false, error: "Invalid block ID" };
    await connection();
    const doc = await Block.findById(id).lean();
    if (!doc) return { success: false, error: "Block not found" };
    return { success: true, data: JSON.parse(JSON.stringify(doc)) };
  } catch (err: any) {
    console.error("[getBlockById]", err);
    return { success: false, error: "Failed to load block" };
  }
}

/* -------------------------------------------------------------------------- */
/*                                 mutations                                  */
/* -------------------------------------------------------------------------- */

export async function createBlock(formData: FormData) {
  await requireAdmin();
  const parsed = parseBlockForm(formData);
  if ("error" in parsed) return { success: false, message: parsed.error };

  try {
    await connection();
    const doc = new Block(parsed.doc);
    await doc.save();
    revalidateBlocks(doc.location as BlockLocation);
    return {
      success: true,
      message: "Block created successfully",
      data: JSON.parse(JSON.stringify(doc.toObject())),
    };
  } catch (err: any) {
    console.error("[createBlock]", err);
    return {
      success: false,
      message: err?.message ?? "Failed to create block",
    };
  }
}

export async function updateBlock(id: string, formData: FormData) {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id))
    return { success: false, message: "Invalid block ID" };

  const parsed = parseBlockForm(formData);
  if ("error" in parsed) return { success: false, message: parsed.error };

  try {
    await connection();
    const updated = await Block.findByIdAndUpdate(id, parsed.doc, {
      new: true,
      runValidators: true,
    });
    if (!updated) return { success: false, message: "Block not found" };
    revalidateBlocks(updated.location as BlockLocation);
    return {
      success: true,
      message: "Block updated successfully",
      data: JSON.parse(JSON.stringify(updated.toObject())),
    };
  } catch (err: any) {
    console.error("[updateBlock]", err);
    return {
      success: false,
      message: err?.message ?? "Failed to update block",
    };
  }
}

export async function deleteBlock(id: string) {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id))
    return { success: false, error: "Invalid block ID" };

  try {
    await connection();
    const deleted = await Block.findByIdAndDelete(id);
    if (!deleted) return { success: false, error: "Block not found" };
    revalidateBlocks(deleted.location as BlockLocation);
    return { success: true, message: "Block deleted successfully" };
  } catch (err: any) {
    console.error("[deleteBlock]", err);
    return { success: false, error: "Failed to delete block" };
  }
}

export async function reorderBlocks(
  location: BlockLocation,
  orderedIds: string[],
) {
  await requireAdmin();
  if (!BLOCK_LOCATIONS.includes(location))
    return { success: false, error: "Invalid location" };
  if (!Array.isArray(orderedIds) || orderedIds.length === 0)
    return { success: false, error: "No ids provided" };
  if (!orderedIds.every((id) => mongoose.Types.ObjectId.isValid(id)))
    return { success: false, error: "Invalid ids" };

  try {
    await connection();
    await Block.bulkWrite(
      orderedIds.map((id, i) => ({
        updateOne: {
          filter: { _id: id, location },
          update: { order: i },
        },
      })),
    );
    revalidateBlocks(location);
    return { success: true, message: "Blocks reordered" };
  } catch (err: any) {
    console.error("[reorderBlocks]", err);
    return { success: false, error: "Failed to reorder blocks" };
  }
}
