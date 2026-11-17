// app/actions/trustBadge.ts
"use server";
import { requireAdmin } from "@/lib/authz";

import { isValidBadgeLink, BADGE_ICON_VALUES } from "@/lib/trust/badgeIcons";
import { revalidatePath } from "next/cache";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: unknown): boolean {
  return typeof id === "string" && OBJECT_ID_RE.test(id);
}

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
  await requireAdmin();
  try {
    const docs = await apiData<any[]>("/trust-badges", {
      query: opts?.includeInactive ? { includeInactive: "true" } : undefined,
    });

    return (docs ?? []).map((d) => ({
      ...serialize(d),
      usageCount: typeof d.usageCount === "number" ? d.usageCount : 0,
    }));
  } catch (err) {
    console.error("[listTrustBadges] Failed:", err);
    return [];
  }
}

export async function listActiveTrustBadges(): Promise<TrustBadgeDTO[]> {
  await requireAdmin();
  return listTrustBadges({ includeInactive: false });
}

export async function getTrustBadge(
  id: string,
): Promise<ActionResult<TrustBadgeDTO>> {
  await requireAdmin();
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid badge id" };
    }
    const doc = await apiData<any>(`/trust-badges/${encodeURIComponent(id)}`);
    return { success: true, data: serialize(doc) };
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: false, error: "Badge not found" };
    }
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
  await requireAdmin();
  try {
    const invalid = validate(input);
    if (invalid) return { success: false, error: invalid };

    // Sort order is auto-assigned by the backend when not provided.
    const doc = await apiData<any>("/trust-badges", {
      method: "POST",
      body: input,
    });

    revalidate();
    return {
      success: true,
      data: serialize(doc),
      message: "Badge created",
    };
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
  await requireAdmin();
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid badge id" };
    }
    const invalid = validate(input);
    if (invalid) return { success: false, error: invalid };

    // The backend snapshots fresh fields into every hero that references
    // this badge and reports how many documents it touched.
    const res = await apiData<{ badge: any; syncedHeroes: number }>(
      `/trust-badges/${encodeURIComponent(id)}`,
      { method: "PATCH", body: input },
    );

    revalidate();
    return {
      success: true,
      data: {
        badge: serialize(res?.badge),
        syncedHeroes: res?.syncedHeroes ?? 0,
      },
      message: "Badge updated",
    };
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: false, error: "Badge not found" };
    }
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
  await requireAdmin();
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid badge id" };
    }

    const res = await apiData<{ affectedHeroes: number }>(
      `/trust-badges/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        query: opts?.force ? { force: "true" } : undefined,
      },
    );

    revalidate();
    return {
      success: true,
      data: { affectedHeroes: res?.affectedHeroes ?? 0 },
      message: "Badge deleted",
    };
  } catch (err: any) {
    console.error("[deleteTrustBadge] Failed:", err);
    if (err instanceof ApiError && err.status === 404) {
      return { success: false, error: "Badge not found" };
    }
    return { success: false, error: err?.message ?? "Failed to delete badge" };
  }
}

/* ------------------------------------------------------------------ */
/*  Reorder                                                            */
/* ------------------------------------------------------------------ */
export async function reorderTrustBadges(
  orderedIds: string[],
): Promise<ActionResult> {
  await requireAdmin();
  try {
    if (!Array.isArray(orderedIds)) {
      return { success: false, error: "orderedIds must be an array" };
    }
    const valid = orderedIds.filter((id) => isValidObjectId(id));
    if (valid.length === 0) return { success: true, data: null };

    await apiFetch("/trust-badges/reorder", {
      method: "POST",
      body: { orderedIds: valid },
    });
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
  await requireAdmin();
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid badge id" };
    }

    const res = await apiData<{ syncedHeroes: number }>(
      `/trust-badges/${encodeURIComponent(id)}/resync`,
      { method: "POST" },
    );

    revalidate();
    return {
      success: true,
      data: { syncedHeroes: res?.syncedHeroes ?? 0 },
      message: "Heroes synced",
    };
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: false, error: "Badge not found" };
    }
    console.error("[resyncTrustBadgeInHeroes] Failed:", err);
    return { success: false, error: err?.message ?? "Failed to sync" };
  }
}
