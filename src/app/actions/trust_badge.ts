// app/actions/trustBadge.ts
"use server";

import { connection } from "@/utils/connection";
import TrustBadge, { ITrustBadgeDoc } from "@/models/TrustBadge";
import HeroContent from "@/models/HeroContent";
import { isValidBadgeLink, BADGE_ICON_VALUES } from "@/lib/trust/badgeIcons";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface TrustBadgeDTO {
  _id: string;
  name: string;
  icon: string;
  title: string;
  description: string;
  popupText: string;
  link: string;
  isActive: boolean;
  sortOrder: number;
  usageCount?: number;
}

export interface TrustBadgeInput {
  name: string;
  icon: string;
  title: string;
  description?: string;
  popupText?: string;
  link?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function serialize(doc: any): TrustBadgeDTO {
  return {
    _id: String(doc._id),
    name: doc.name ?? "",
    icon: doc.icon ?? "shield-check",
    title: doc.title ?? "",
    description: doc.description ?? "",
    popupText: doc.popupText ?? "",
    link: doc.link ?? "",
    isActive: !!doc.isActive,
    sortOrder: typeof doc.sortOrder === "number" ? doc.sortOrder : 0,
  };
}

function validate(input: TrustBadgeInput): string | null {
  if (!input.name?.trim()) return "Internal name is required";
  if (!input.title?.trim()) return "Title is required";
  if (!input.icon || !BADGE_ICON_VALUES.includes(input.icon as any)) {
    return "Invalid icon";
  }
  if (input.link && !isValidBadgeLink(input.link.trim())) {
    return "Link must be a valid URL or start with /";
  }
  return null;
}

const revalidate = () => {
  revalidatePath("/content-management/trust-badges");
  revalidatePath("/content-management/app/hero_content");
  revalidatePath("/");
};

/* ------------------------------------------------------------------ */
/*  Read                                                               */
/* ------------------------------------------------------------------ */
export async function listTrustBadges(opts?: {
  includeInactive?: boolean;
}): Promise<TrustBadgeDTO[]> {
  try {
    await connection();
    const filter = opts?.includeInactive ? {} : { isActive: true };
    const docs = await TrustBadge.find(filter)
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    if (docs.length === 0) return [];

    // Single aggregation for usage counts
    const usage = await HeroContent.aggregate([
      { $unwind: "$trustBadges" },
      {
        $match: {
          "trustBadges.badgeId": {
            $in: docs.map((d) => d._id),
          },
        },
      },
      { $group: { _id: "$trustBadges.badgeId", count: { $sum: 1 } } },
    ]);
    const usageMap = new Map(
      usage.map((u) => [String(u._id), u.count as number]),
    );

    return docs.map((d) => ({
      ...serialize(d),
      usageCount: usageMap.get(String(d._id)) ?? 0,
    }));
  } catch (err) {
    console.error("[listTrustBadges] Failed:", err);
    return [];
  }
}

export async function listActiveTrustBadges(): Promise<TrustBadgeDTO[]> {
  return listTrustBadges({ includeInactive: false });
}

export async function getTrustBadge(
  id: string,
): Promise<ActionResult<TrustBadgeDTO>> {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid badge id" };
    }
    await connection();
    const doc = await TrustBadge.findById(id).lean();
    if (!doc) return { success: false, error: "Badge not found" };
    return { success: true, data: serialize(doc) };
  } catch (err: any) {
    console.error("[getTrustBadge] Failed:", err);
    return { success: false, error: err?.message ?? "Failed to load badge" };
  }
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */
export async function createTrustBadge(
  input: TrustBadgeInput,
): Promise<ActionResult<TrustBadgeDTO>> {
  try {
    const invalid = validate(input);
    if (invalid) return { success: false, error: invalid };

    await connection();

    // Auto-assign sortOrder to top of list
    const min: any = await TrustBadge.findOne()
      .sort({ sortOrder: 1 })
      .select("sortOrder")
      .lean();
    const sortOrder =
      typeof input.sortOrder === "number"
        ? input.sortOrder
        : (min?.sortOrder ?? 0) - 1;

    const doc = await TrustBadge.create({
      name: input.name.trim(),
      icon: input.icon,
      title: input.title.trim(),
      description: (input.description ?? "").trim(),
      popupText: (input.popupText ?? "").trim(),
      link: (input.link ?? "").trim(),
      isActive: input.isActive ?? true,
      sortOrder,
    });

    revalidate();
    return { success: true, data: serialize(doc), message: "Badge created" };
  } catch (err: any) {
    console.error("[createTrustBadge] Failed:", err);
    return { success: false, error: err?.message ?? "Failed to create badge" };
  }
}

/* ------------------------------------------------------------------ */
/*  Update (+ auto-resync in heroes)                                   */
/* ------------------------------------------------------------------ */
export async function updateTrustBadge(
  id: string,
  input: TrustBadgeInput,
): Promise<ActionResult<{ badge: TrustBadgeDTO; syncedHeroes: number }>> {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid badge id" };
    }
    const invalid = validate(input);
    if (invalid) return { success: false, error: invalid };

    await connection();

    const updated: any = await TrustBadge.findByIdAndUpdate(
      id,
      {
        $set: {
          name: input.name.trim(),
          icon: input.icon,
          title: input.title.trim(),
          description: (input.description ?? "").trim(),
          popupText: (input.popupText ?? "").trim(),
          link: (input.link ?? "").trim(),
          ...(input.isActive !== undefined
            ? { isActive: !!input.isActive }
            : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
        },
      },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) return { success: false, error: "Badge not found" };

    // Snapshot resync: propagate fresh fields into every hero that
    // references this badge. Ad-hoc badges (badgeId: null) are untouched.
    const res = await HeroContent.updateMany(
      { "trustBadges.badgeId": updated._id },
      {
        $set: {
          "trustBadges.$[b].icon": updated.icon,
          "trustBadges.$[b].title": updated.title,
          "trustBadges.$[b].description": updated.description ?? "",
          "trustBadges.$[b].popupText": updated.popupText ?? "",
          "trustBadges.$[b].link": updated.link ?? "",
        },
      },
      { arrayFilters: [{ "b.badgeId": updated._id }] },
    );

    revalidate();
    return {
      success: true,
      data: { badge: serialize(updated), syncedHeroes: res.modifiedCount ?? 0 },
      message: "Badge updated",
    };
  } catch (err: any) {
    console.error("[updateTrustBadge] Failed:", err);
    return { success: false, error: err?.message ?? "Failed to update badge" };
  }
}

/* ------------------------------------------------------------------ */
/*  Delete (block if in use, unless force)                             */
/* ------------------------------------------------------------------ */
export async function deleteTrustBadge(
  id: string,
  opts?: { force?: boolean },
): Promise<ActionResult<{ affectedHeroes: number }>> {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid badge id" };
    }
    await connection();

    const badge = await TrustBadge.findById(id);
    if (!badge) return { success: false, error: "Badge not found" };

    const usage = await HeroContent.countDocuments({
      "trustBadges.badgeId": id,
    });

    if (usage > 0 && !opts?.force) {
      return {
        success: false,
        error: `This badge is used in ${usage} hero${
          usage === 1 ? "" : "es"
        }. Archive it or force-delete to detach it.`,
      };
    }

    if (usage > 0) {
      // Force delete: detach refs, keep snapshot fields intact so heroes
      // still render (they simply become ad-hoc).
      await HeroContent.updateMany(
        { "trustBadges.badgeId": badge._id },
        { $set: { "trustBadges.$[b].badgeId": null } },
        { arrayFilters: [{ "b.badgeId": badge._id }] },
      );
    }

    await badge.deleteOne();
    revalidate();
    return {
      success: true,
      data: { affectedHeroes: usage },
      message: "Badge deleted",
    };
  } catch (err: any) {
    console.error("[deleteTrustBadge] Failed:", err);
    return { success: false, error: err?.message ?? "Failed to delete badge" };
  }
}

/* ------------------------------------------------------------------ */
/*  Reorder                                                            */
/* ------------------------------------------------------------------ */
export async function reorderTrustBadges(
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    if (!Array.isArray(orderedIds)) {
      return { success: false, error: "orderedIds must be an array" };
    }
    const valid = orderedIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );
    if (valid.length === 0) return { success: true, data: null };

    await connection();
    await TrustBadge.bulkWrite(
      valid.map((id, i) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { sortOrder: i } },
        },
      })),
    );
    revalidate();
    return { success: true, data: null, message: "Order updated" };
  } catch (err: any) {
    console.error("[reorderTrustBadges] Failed:", err);
    return { success: false, error: err?.message ?? "Failed to reorder" };
  }
}

/* ------------------------------------------------------------------ */
/*  Manual resync (exposed for the "Sync X heroes" prompt)             */
/* ------------------------------------------------------------------ */
export async function resyncTrustBadgeInHeroes(
  id: string,
): Promise<ActionResult<{ syncedHeroes: number }>> {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid badge id" };
    }
    await connection();
    const badge: any = await TrustBadge.findById(id).lean();
    if (!badge) return { success: false, error: "Badge not found" };

    const res = await HeroContent.updateMany(
      { "trustBadges.badgeId": badge._id },
      {
        $set: {
          "trustBadges.$[b].icon": badge.icon,
          "trustBadges.$[b].title": badge.title,
          "trustBadges.$[b].description": badge.description ?? "",
          "trustBadges.$[b].popupText": badge.popupText ?? "",
          "trustBadges.$[b].link": badge.link ?? "",
        },
      },
      { arrayFilters: [{ "b.badgeId": badge._id }] },
    );

    revalidate();
    return {
      success: true,
      data: { syncedHeroes: res.modifiedCount ?? 0 },
      message: "Heroes synced",
    };
  } catch (err: any) {
    console.error("[resyncTrustBadgeInHeroes] Failed:", err);
    return { success: false, error: err?.message ?? "Failed to sync" };
  }
}
