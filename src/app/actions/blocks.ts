// app/actions/blocks.ts
"use server";
import { requireAdmin } from "@/lib/authz";
import { revalidatePath, updateTag } from "next/cache";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";
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
  CARD_RATIOS,
  CARD_SIZES,
  CARD_LAYOUTS,
  TITLE_POSITIONS,
  IMAGE_POSITIONS,
  MAX_BLOCK_LIMIT,
  type BlockLocation,
} from "@/lib/content/constants";

const LIST_PATH = "/channels/store/content/blocks";
const MAX_BANNERS_PER_BLOCK = 20;

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: unknown): boolean {
  return typeof id === "string" && OBJECT_ID_RE.test(id);
}

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

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function readColor(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s === "transparent") return "transparent";
  if (HEX_RE.test(s)) return s;
  return "";
}

function readIdArray(fd: FormData, key: string, limit: number): string[] {
  try {
    const raw = fd.get(key);
    if (!raw) return [];
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && isValidObjectId(x))
      .slice(0, limit);
  } catch {
    return [];
  }
}

function revalidateBlocks(location: BlockLocation) {
  revalidatePath("/");
  revalidatePath("/products/[slug]", "page");
  revalidatePath(LIST_PATH);
  updateTag("blocks");
  updateTag(`blocks:${location}`);
  updateTag("banners");
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

const PREVIEW_SOURCE_TYPES = [
  "collection",
  "category",
  "promotion",
  "banner",
] as const;

export async function getSourcePreview(
  sourceType: string,
  id: string,
): Promise<SourcePreviewResult> {
  await requireAdmin();
  if (!isValidObjectId(id)) {
    return { success: false, error: "Invalid ID" };
  }
  if (!(PREVIEW_SOURCE_TYPES as readonly string[]).includes(sourceType)) {
    return { success: false, error: "Unsupported source type" };
  }

  try {
    const data = await apiData<SourcePreviewData>(
      `/blocks/source-preview/${encodeURIComponent(sourceType)}/${encodeURIComponent(id)}`,
    );
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: false, error: "Not found", missing: true };
    }
    console.error("[getSourcePreview]", err);
    return { success: false, error: "Failed to load preview" };
  }
}

/* -------------------------------------------------------------------------- */
/*                             form parsing                                   */
/* -------------------------------------------------------------------------- */

type ParseOk = { doc: Record<string, any> };
type ParseErr = { error: string };

function parseDisplayConfig(fd: FormData): Record<string, any> {
  return {
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
    cardRatio: pickEnum(fd.get("displayConfig.cardRatio"), CARD_RATIOS, "1:1"),
    cardSize: pickEnum(fd.get("displayConfig.cardSize"), CARD_SIZES, "md"),
    cardLayout: pickEnum(
      fd.get("displayConfig.cardLayout"),
      CARD_LAYOUTS,
      "stacked",
    ),
    titlePosition: pickEnum(
      fd.get("displayConfig.titlePosition"),
      TITLE_POSITIONS,
      "below",
    ),
    imagePosition: pickEnum(
      fd.get("displayConfig.imagePosition"),
      IMAGE_POSITIONS,
      "center",
    ),
    backgroundColor: readColor(fd.get("displayConfig.backgroundColor")),
    textColor: readColor(fd.get("displayConfig.textColor")),
  };
}

function parseCta(fd: FormData) {
  return {
    text: String(fd.get("cta.text") ?? "").trim(),
    link: String(fd.get("cta.link") ?? "").trim(),
    style: pickEnum(fd.get("cta.style"), CTA_STYLES, "none"),
  };
}

function parseBlockForm(fd: FormData): ParseOk | ParseErr {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  const location = pickEnum(
    fd.get("location"),
    BLOCK_LOCATIONS,
    "Home" as BlockLocation,
  );
  const display = pickEnum(fd.get("display"), BLOCK_DISPLAYS, "grid");
  const sourceType = pickEnum(
    fd.get("source.type"),
    BLOCK_SOURCE_TYPES,
    "collection",
  );

  const source: any = { type: sourceType };

  if (sourceType === "collection") {
    const id = String(fd.get("source.collectionId") ?? "");
    if (!isValidObjectId(id)) return { error: "Select a collection" };
    source.collectionId = id;
  } else if (sourceType === "category") {
    const id = String(fd.get("source.categoryId") ?? "");
    if (!isValidObjectId(id)) return { error: "Select a category" };
    source.categoryId = id;
  } else if (sourceType === "promotion") {
    const id = String(fd.get("source.promotionId") ?? "");
    if (!isValidObjectId(id)) return { error: "Select a promotion" };
    source.promotionId = id;
    source.promotionMode = pickEnum(
      fd.get("source.promotionMode"),
      PROMOTION_MODES,
      "products",
    );
  } else if (sourceType === "banner") {
    const ids = readIdArray(fd, "source.bannerIds", MAX_BANNERS_PER_BLOCK);
    if (ids.length === 0) {
      return { error: "Select at least one banner from the library" };
    }
    source.bannerIds = ids;
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
          isValidObjectId(i.refId),
      )
      .slice(0, 50)
      .map((i) => ({
        refModel: i.refModel,
        refId: i.refId,
      }));

    if (items.length === 0)
      return { error: "Add at least one item for a manual block" };
    source.items = items;
  }

  const heading =
    sourceType === "banner"
      ? { title: "", subtitle: "", showHeading: false }
      : {
          title: String(fd.get("heading.title") ?? "").trim(),
          subtitle: String(fd.get("heading.subtitle") ?? "").trim(),
          showHeading: readBool(fd, "heading.showHeading", true),
        };

  const cta =
    sourceType === "banner"
      ? { text: "", link: "", style: "none" as const }
      : parseCta(fd);

  if (cta.style !== "none" && !cta.link) {
    return { error: "CTA requires a link" };
  }

  const doc: Record<string, any> = {
    name,
    location,
    display,
    source,
    heading,
    displayConfig: parseDisplayConfig(fd),
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
    cta,
    limit: clamp(readNum(fd, "limit", 12), 1, MAX_BLOCK_LIMIT),
    status: pickEnum(
      fd.get("status"),
      ["active", "inactive"] as const,
      "active",
    ),
    order: Math.max(0, readNum(fd, "order", 0)),
  };

  return { doc };
}

/* -------------------------------------------------------------------------- */
/*                                  reads                                     */
/* -------------------------------------------------------------------------- */

export async function getAllBlocks(location?: BlockLocation) {
  await requireAdmin();
  try {
    const docs = await apiData<any[]>("/blocks", {
      query: location ? { location } : undefined,
    });
    return { success: true, data: docs ?? [] };
  } catch (err: any) {
    console.error("[getAllBlocks]", err);
    return { success: false, error: err?.message ?? "Failed to load blocks" };
  }
}

export async function getBlockById(id: string) {
  await requireAdmin();
  try {
    if (!isValidObjectId(id))
      return { success: false, error: "Invalid block ID" };
    const doc = await apiData<any>(`/blocks/${encodeURIComponent(id)}`);
    return { success: true, data: doc };
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: false, error: "Block not found" };
    }
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
    const doc = await apiData<any>("/blocks", {
      method: "POST",
      body: parsed.doc,
    });
    revalidateBlocks(doc.location as BlockLocation);
    return {
      success: true,
      message: "Block created successfully",
      data: doc,
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
  if (!isValidObjectId(id))
    return { success: false, message: "Invalid block ID" };

  const parsed = parseBlockForm(formData);
  if ("error" in parsed) return { success: false, message: parsed.error };

  try {
    const updated = await apiData<any>(`/blocks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: parsed.doc,
    });
    revalidateBlocks(updated.location as BlockLocation);
    return {
      success: true,
      message: "Block updated successfully",
      data: updated,
    };
  } catch (err: any) {
    console.error("[updateBlock]", err);
    if (err instanceof ApiError && err.status === 404) {
      return { success: false, message: "Block not found" };
    }
    return {
      success: false,
      message: err?.message ?? "Failed to update block",
    };
  }
}

export async function deleteBlock(id: string) {
  await requireAdmin();
  if (!isValidObjectId(id))
    return { success: false, error: "Invalid block ID" };

  try {
    const deleted = await apiData<any>(`/blocks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const location = (deleted?.location ?? "Home") as BlockLocation;
    revalidateBlocks(location);
    return { success: true, message: "Block deleted successfully" };
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: false, error: "Block not found" };
    }
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
  if (!orderedIds.every((id) => isValidObjectId(id)))
    return { success: false, error: "Invalid ids" };

  try {
    await apiFetch("/blocks/reorder", {
      method: "POST",
      body: { location, orderedIds },
    });
    revalidateBlocks(location);
    return { success: true, message: "Blocks reordered" };
  } catch (err: any) {
    console.error("[reorderBlocks]", err);
    return { success: false, error: "Failed to reorder blocks" };
  }
}
