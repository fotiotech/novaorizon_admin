// app/actions/collection.ts
"use server";
import { requireAdmin } from "@/lib/authz";

import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { Collection, TARGET_TYPES, type TargetType } from "@/models/Collection";
import { CARD_SHAPES, CTA_STYLES } from "@/lib/content/collectionTypes";
import { deleteS3Object } from "./s3";
import { buildQueryFromRules } from "@/lib/content/query";
import {
  getEntityConfig,
  type RegistryKey,
} from "@/lib/content/entityRegistry";
import {
  getRecommendationResolver,
  type RecommendationContext,
} from "@/lib/content/recommendationResolvers";

const COLLECTION_LIST_PATH = "/catalog/collections";
const MANUAL_ITEM_LIMIT = 50;

/* ----------------------------- Validation ------------------------------- */

function normalizeTarget(raw: unknown): TargetType | null {
  const t = String(raw ?? "");
  return (TARGET_TYPES as readonly string[]).includes(t)
    ? (t as TargetType)
    : null;
}

function validateRules(rules: any[], targetType: TargetType) {
  const cfg = getEntityConfig(targetType);
  if (!cfg) return { error: "Unknown target type" };
  const allowed = new Set(cfg.attributes.map((a) => a.value));

  for (const [i, rule] of rules.entries()) {
    if (!rule.attribute || !rule.operator) {
      return { error: `Rule ${i + 1}: attribute and operator are required` };
    }
    if (!allowed.has(rule.attribute)) {
      return {
        error: `Rule ${i + 1}: "${rule.attribute}" is not a valid ${targetType} attribute`,
      };
    }
    if (rule.value === undefined || rule.value === null || rule.value === "") {
      return { error: `Rule ${i + 1}: value is required` };
    }
  }
  return null;
}

function validateItems(items: string[], targetType: TargetType) {
  if (items.length > MANUAL_ITEM_LIMIT) {
    return {
      error: `A manual collection can contain at most ${MANUAL_ITEM_LIMIT} items. Received ${items.length}.`,
    };
  }
  for (const id of items) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { error: `Invalid ${targetType} ID: ${id}` };
    }
  }
  return null;
}

function validateRecommendation(
  targetType: TargetType,
  kind: string,
  limit: number,
) {
  const cfg = getEntityConfig(targetType);
  if (!cfg) return { error: "Unknown target type" };
  if (!cfg.supportsRecommendation) {
    return {
      error: `${cfg.label} collections do not support recommendations`,
    };
  }
  if (!kind || !cfg.recommendationTypes?.includes(kind)) {
    return {
      error: `Invalid recommendation kind for ${cfg.singular}. Expected one of: ${cfg.recommendationTypes?.join(", ") ?? "—"}`,
    };
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return { error: "Recommendation limit must be between 1 and 100" };
  }
  return null;
}

function readDisplay(formData: FormData) {
  const cardShapeRaw =
    (formData.get("display.cardShape") as string) || "default";
  if (!(CARD_SHAPES as readonly string[]).includes(cardShapeRaw)) {
    return { error: "Invalid card shape" as const };
  }
  return {
    display: {
      layout: (formData.get("display.layout") as string) || "carousel",
      columns: parseInt(formData.get("display.columns") as string) || 4,
      gap: parseInt(formData.get("display.gap") as string) || 16,
      showImages: formData.get("display.showImages") === "true",
      cardShape: cardShapeRaw,
    },
  };
}

function readCta(formData: FormData) {
  const ctaStyleRaw = (formData.get("ctaStyle") as string) || "none";
  const ctaStyle = (CTA_STYLES as readonly string[]).includes(ctaStyleRaw)
    ? ctaStyleRaw
    : "none";

  const ctaText = ((formData.get("ctaText") as string) || "").trim();
  const ctaLink = ((formData.get("ctaLink") as string) || "").trim();

  const effectiveStyle =
    ctaStyle !== "none" && (!ctaText || !ctaLink) ? "none" : ctaStyle;

  return {
    ctaText: ctaText || undefined,
    ctaLink: ctaLink || undefined,
    ctaStyle: effectiveStyle,
  };
}

function readSort(formData: FormData) {
  const field = ((formData.get("sort.field") as string) || "").trim();
  const direction =
    ((formData.get("sort.direction") as string) || "asc") === "desc"
      ? "desc"
      : "asc";
  return field ? { field, direction } : undefined;
}

/* --------------------------- Read: admin list ---------------------------- */

export async function getAllCollections(targetType?: TargetType) {
  await requireAdmin();
  try {
    await connection();
    const filter: any = {};
    if (targetType) filter.targetType = targetType;
    const docs = await Collection.find(filter).sort({
      order: 1,
      created_at: -1,
    });
    return { success: true, data: JSON.parse(JSON.stringify(docs)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Resolves collection items, ordered by `order` ascending and `created_at`
 * descending. Recommendations are only resolved when
 * `resolveRecommendations: true` is passed (the storefront does this with a
 * `recommendationContext.userId`). The admin list calls without that flag —
 * recommendation rows come back with `isDynamic: true` and no items.
 */
export async function getResolvedCollections(opts?: {
  targetType?: TargetType;
  status?: "active" | "inactive";
  resolveRecommendations?: boolean;
  recommendationContext?: RecommendationContext;
}) {
  await requireAdmin();
  try {
    await connection();
    const filter: any = {};
    if (opts?.targetType) filter.targetType = opts.targetType;
    if (opts?.status) filter.status = opts.status;

    const docs = await Collection.find(filter)
      .sort({ order: 1, created_at: -1 })
      .populate("items")
      .lean();

    const shouldResolveRec = opts?.resolveRecommendations === true;
    const recCtx = opts?.recommendationContext;

    const results = await Promise.all(
      docs.map(async (c: any) => {
        const cfg = getEntityConfig(c.targetType);
        let items: any[] = [];

        if (!cfg) {
          items = [];
        } else if (c.type === "manual") {
          items = c.items ?? [];
        } else if (c.type === "rule") {
          const query = buildQueryFromRules(
            c.rules ?? [],
            c.targetType as TargetType,
          );
          if (Object.keys(query).length > 0) {
            let q = cfg.model.find(query).limit(MANUAL_ITEM_LIMIT);
            if (c.sort?.field) {
              q = q.sort({
                [c.sort.field]: c.sort.direction === "asc" ? 1 : -1,
              });
            }
            items = (await q.lean()) as any[];
          }
        } else if (c.type === "recommendation" && shouldResolveRec) {
          const resolver = getRecommendationResolver(c.targetType);
          if (resolver) {
            items = await resolver(
              c.recommendationType ?? "",
              c.recommendationLimit ?? 10,
              recCtx,
            );
          }
        }

        return {
          collection: {
            _id: c._id,
            name: c.name,
            description: c.description,
            imageUrl: c.imageUrl,
            type: c.type,
            targetType: c.targetType,
            rules: c.rules,
            items: c.items,
            display: c.display ?? {},
            ctaText: c.ctaText ?? null,
            ctaLink: c.ctaLink ?? null,
            ctaStyle: c.ctaStyle ?? "none",
            status: c.status,
            order: c.order,
            sort: c.sort ?? null,
            showName: c.showName,
            recommendationType: c.recommendationType ?? null,
            recommendationLimit: c.recommendationLimit ?? null,
            created_at: c.created_at,
            updated_at: c.updated_at,
          },
          items,
          itemCount: items.length,
          isDynamic: c.type === "recommendation",
        };
      }),
    );

    return { success: true, data: results };
  } catch (error) {
    console.error("Error resolving collections:", error);
    return { success: false, error: "Failed to fetch collections" };
  }
}

/* ------------------------------ Create ---------------------------------- */

export async function createCollection(formData: FormData) {
  await requireAdmin();
  try {
    await connection();

    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string) ?? "";
    const imageUrl = (formData.get("imageUrl") as string) ?? "";
    const status = (formData.get("status") as string) || "active";
    const type = (formData.get("type") as string) || "rule";
    const targetTypeRaw = formData.get("targetType");
    const order = parseInt(formData.get("order") as string) || 0;
    const showName = formData.get("showName") === "true";

    const recommendationType =
      (formData.get("recommendationType") as string) || "";
    const recommendationLimit =
      parseInt(formData.get("recommendationLimit") as string) || 10;

    const displayResult = readDisplay(formData);
    if ("error" in displayResult) {
      return { success: false, error: displayResult.error };
    }
    const { display } = displayResult;

    const { ctaText, ctaLink, ctaStyle } = readCta(formData);

    const sort = readSort(formData);

    if (!name) return { success: false, error: "Name is required" };

    const targetType = normalizeTarget(targetTypeRaw);
    if (!targetType) return { success: false, error: "Invalid target type" };

    const cfg = getEntityConfig(targetType);
    if (!cfg) return { success: false, error: "Unknown target type" };

    if (!["rule", "manual", "recommendation"].includes(type)) {
      return { success: false, error: "Invalid collection type" };
    }
    if (type === "rule" && !cfg.supportsRule) {
      return {
        success: false,
        error: `Rule collections are not supported for ${cfg.label}`,
      };
    }
    if (type === "manual" && !cfg.supportsManual) {
      return {
        success: false,
        error: `Manual collections are not supported for ${cfg.label}`,
      };
    }

    let rules: any[] = [];
    let items: string[] = [];

    if (type === "rule") {
      try {
        rules = JSON.parse((formData.get("rules") as string) || "[]");
      } catch {
        return { success: false, error: "Invalid rules format" };
      }
      if (!Array.isArray(rules))
        return { success: false, error: "Rules must be an array" };
      rules.forEach((r, i) => {
        if (typeof r.position !== "number") r.position = i;
      });
      const invalid = validateRules(rules, targetType);
      if (invalid) return { success: false, error: invalid.error };
      rules.sort((a, b) => a.position - b.position);
    } else if (type === "manual") {
      try {
        items = JSON.parse((formData.get("items") as string) || "[]");
      } catch {
        return { success: false, error: "Invalid items format" };
      }
      if (!Array.isArray(items))
        return { success: false, error: "Items must be an array" };
      items = Array.from(new Set(items.map((v) => String(v))));
      const invalid = validateItems(items, targetType);
      if (invalid) return { success: false, error: invalid.error };
    } else if (type === "recommendation") {
      const invalid = validateRecommendation(
        targetType,
        recommendationType,
        recommendationLimit,
      );
      if (invalid) return { success: false, error: invalid.error };
    }

    const existing = await Collection.findOne({ name, targetType });
    if (existing) {
      return {
        success: false,
        error: `A ${cfg.singular} collection with this name already exists`,
      };
    }

    const doc = new Collection({
      name,
      description: description.trim(),
      imageUrl,
      status,
      type,
      targetType,
      rules: type === "rule" ? rules : [],
      items: type === "manual" ? items : [],
      recommendationType:
        type === "recommendation" ? recommendationType : undefined,
      recommendationLimit:
        type === "recommendation" ? recommendationLimit : undefined,
      display,
      ctaText,
      ctaLink,
      ctaStyle,
      order,
      showName,
      sort,
    });

    await doc.save();
    revalidatePath(COLLECTION_LIST_PATH);
    return {
      success: true,
      data: doc.toObject(),
      message: "Collection created successfully",
    };
  } catch (error: any) {
    console.error("Error creating collection:", error);
    return { success: false, error: "Failed to create collection" };
  }
}

/* ------------------------------ Update ---------------------------------- */

export async function updateCollection(id: string, formData: FormData) {
  await requireAdmin();
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }
    await connection();

    const existing = await Collection.findById(id);
    if (!existing) return { success: false, error: "Collection not found" };

    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string) ?? "";
    const imageUrl = (formData.get("imageUrl") as string) ?? "";
    const status = (formData.get("status") as string) || "active";
    const type = (formData.get("type") as string) || "rule";
    const targetTypeRaw = formData.get("targetType");
    const order = parseInt(formData.get("order") as string) || 0;
    const showName = formData.get("showName") === "true";

    const recommendationType =
      (formData.get("recommendationType") as string) || "";
    const recommendationLimit =
      parseInt(formData.get("recommendationLimit") as string) || 10;

    const displayResult = readDisplay(formData);
    if ("error" in displayResult) {
      return { success: false, error: displayResult.error };
    }
    const { display } = displayResult;

    const { ctaText, ctaLink, ctaStyle } = readCta(formData);

    const sort = readSort(formData);

    if (!name) return { success: false, error: "Name is required" };

    const targetType = normalizeTarget(targetTypeRaw);
    if (!targetType) return { success: false, error: "Invalid target type" };

    const cfg = getEntityConfig(targetType);
    if (!cfg) return { success: false, error: "Unknown target type" };

    if (!["rule", "manual", "recommendation"].includes(type)) {
      return { success: false, error: "Invalid collection type" };
    }

    let rules: any[] = [];
    let items: string[] = [];

    if (type === "rule") {
      try {
        rules = JSON.parse((formData.get("rules") as string) || "[]");
      } catch {
        return { success: false, error: "Invalid rules format" };
      }
      rules.forEach((r, i) => {
        if (typeof r.position !== "number") r.position = i;
      });
      const invalid = validateRules(rules, targetType);
      if (invalid) return { success: false, error: invalid.error };
      rules.sort((a, b) => a.position - b.position);
    } else if (type === "manual") {
      try {
        items = JSON.parse((formData.get("items") as string) || "[]");
      } catch {
        return { success: false, error: "Invalid items format" };
      }
      items = Array.from(new Set(items.map((v) => String(v))));
      const invalid = validateItems(items, targetType);
      if (invalid) return { success: false, error: invalid.error };
    } else if (type === "recommendation") {
      const invalid = validateRecommendation(
        targetType,
        recommendationType,
        recommendationLimit,
      );
      if (invalid) return { success: false, error: invalid.error };
    }

    const conflict = await Collection.findOne({
      name,
      targetType,
      _id: { $ne: new mongoose.Types.ObjectId(id) },
    });
    if (conflict) {
      return {
        success: false,
        error: `Another ${cfg.singular} collection with this name already exists`,
      };
    }

    existing.set({
      name,
      description: description.trim(),
      imageUrl,
      status,
      type,
      targetType,
      rules: type === "rule" ? rules : [],
      items: type === "manual" ? items : [],
      recommendationType:
        type === "recommendation" ? recommendationType : undefined,
      recommendationLimit:
        type === "recommendation" ? recommendationLimit : undefined,
      display,
      ctaText,
      ctaLink,
      ctaStyle,
      order,
      showName,
      sort,
    });
    await existing.save();

    revalidatePath(COLLECTION_LIST_PATH);
    return {
      success: true,
      data: existing.toObject(),
      message: "Collection updated successfully",
    };
  } catch (error: any) {
    console.error("Error updating collection:", error);
    return { success: false, error: "Failed to update collection" };
  }
}

/* --------------------------- Single + delete ---------------------------- */

export async function getCollectionById(id: string) {
  await requireAdmin();
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }
    await connection();
    const doc = await Collection.findById(id).populate("items").lean();
    if (!doc) return { success: false, error: "Collection not found" };
    return { success: true, data: doc };
  } catch (error) {
    console.error("Error fetching collection:", error);
    return { success: false, error: "Failed to fetch collection" };
  }
}

export async function deleteCollection(id: string) {
  await requireAdmin();
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }
    await connection();
    const doc = await Collection.findByIdAndDelete(id);
    if (!doc) return { success: false, error: "Collection not found" };
    revalidatePath(COLLECTION_LIST_PATH);
    return { success: true, message: "Collection deleted successfully" };
  } catch (error) {
    console.error("Error deleting collection:", error);
    return { success: false, error: "Failed to delete collection" };
  }
}

export async function deleteCollectionImage(collectionId: string) {
  await requireAdmin();
  try {
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return { success: false, error: "Invalid collection ID" };
    }
    await connection();
    const doc = await Collection.findById(collectionId);
    if (!doc) return { success: false, error: "Collection not found" };
    if (!doc.imageUrl) return { success: false, error: "No image to delete" };
    await deleteS3Object(doc.imageUrl);
    doc.imageUrl = "";
    await doc.save();
    revalidatePath(COLLECTION_LIST_PATH);
    return { success: true };
  } catch (error) {
    console.error("Error deleting collection image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}

/* ----------------------- Pickers for manual / refs ---------------------- */

export async function fetchAvailableItems(
  targetType: string,
  search?: string,
  sortOrder: "asc" | "desc" = "asc",
) {
  await requireAdmin();
  try {
    await connection();
    const cfg = getEntityConfig(targetType);
    if (!cfg)
      return {
        success: false,
        error: `Unsupported target type: ${targetType}`,
      };

    const filter: any = {};
    if (search) filter.name = { $regex: search, $options: "i" };

    const docs = await cfg.model
      .find(filter)
      .sort({ name: sortOrder === "asc" ? 1 : -1 })
      .limit(MANUAL_ITEM_LIMIT)
      .lean();

    return {
      success: true,
      data: (docs as any[]).map((doc) => ({
        _id: String(doc._id),
        name: doc.name || "Untitled",
        imageUrl: cfg.image(doc) ?? null,
      })),
    };
  } catch (error) {
    console.error("Error fetching available items:", error);
    return { success: false, error: "Failed to fetch items" };
  }
}

export async function fetchReferenceOptions(
  refType: RegistryKey,
  search?: string,
) {
  await requireAdmin();
  try {
    await connection();
    const cfg = getEntityConfig(refType);
    if (!cfg) return { success: false, error: "Unknown reference type" };

    const filter: any = {};
    if (search) filter.name = { $regex: search, $options: "i" };

    const docs = await cfg.model
      .find(filter)
      .select("_id name")
      .limit(50)
      .lean();
    return {
      success: true,
      data: (docs as any[]).map((d) => ({
        _id: String(d._id),
        name: d.name || "Untitled",
      })),
    };
  } catch (error) {
    console.error("Error fetching reference options:", error);
    return { success: false, error: "Failed to fetch options" };
  }
}
