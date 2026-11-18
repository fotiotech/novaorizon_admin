// lib/api/trust-badge.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";
import { isValidBadgeLink, BADGE_ICON_VALUES } from "@/lib/trust/badgeIcons";

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

function errorMessage(err: any, fallback: string): string {
  return (
    (typeof err?.response?.data?.error === "string" &&
      err.response.data.error) ||
    (typeof err?.response?.data?.message === "string" &&
      err.response.data.message) ||
    (typeof err?.message === "string" && err.message) ||
    fallback
  );
}

/* ------------------------------------------------------------------ */
/*  Read                                                               */
/* ------------------------------------------------------------------ */

/** GET /api/trust-badges — admin only */
export async function listTrustBadges(opts?: {
  includeInactive?: boolean;
}): Promise<TrustBadgeDTO[]> {
  try {
    const res = await api.get<{ data: any[] }>("/trust-badges", {
      params: opts?.includeInactive ? { includeInactive: "true" } : undefined,
    });
    const docs = Array.isArray(res.data?.data) ? res.data.data : [];

    return docs.map((d) => ({
      ...serialize(d),
      usageCount: typeof d.usageCount === "number" ? d.usageCount : 0,
    }));
  } catch (err) {
    console.error("[listTrustBadges] Failed:", err);
    return [];
  }
}

/** GET /api/trust-badges (active only) — admin only */
export async function listActiveTrustBadges(): Promise<TrustBadgeDTO[]> {
  return listTrustBadges({ includeInactive: false });
}

/** GET /api/trust-badges/:id — admin only */
export async function getTrustBadge(
  id: string,
): Promise<ActionResult<TrustBadgeDTO>> {
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid badge id" };
    }
    const res = await api.get<{ data: any }>(
      `/trust-badges/${encodeURIComponent(id)}`,
    );
    return { success: true, data: serialize(res.data?.data) };
  } catch (err: any) {
    if (isAxiosError(err) && err.response?.status === 404) {
      return { success: false, error: "Badge not found" };
    }
    console.error("[getTrustBadge] Failed:", err);
    return { success: false, error: errorMessage(err, "Failed to load badge") };
  }
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

/** POST /api/trust-badges — admin only */
export async function createTrustBadge(
  input: TrustBadgeInput,
): Promise<ActionResult<TrustBadgeDTO>> {
  try {
    const invalid = validate(input);
    if (invalid) return { success: false, error: invalid };

    // Sort order is auto-assigned by the backend when not provided.
    const res = await api.post<{ data: any }>("/trust-badges", input);

    return {
      success: true,
      data: serialize(res.data?.data),
      message: "Badge created",
    };
  } catch (err: any) {
    console.error("[createTrustBadge] Failed:", err);
    return {
      success: false,
      error: errorMessage(err, "Failed to create badge"),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Update (+ auto-resync in heroes)                                   */
/* ------------------------------------------------------------------ */

/** PATCH /api/trust-badges/:id — admin only */
export async function updateTrustBadge(
  id: string,
  input: TrustBadgeInput,
): Promise<ActionResult<{ badge: TrustBadgeDTO; syncedHeroes: number }>> {
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid badge id" };
    }
    const invalid = validate(input);
    if (invalid) return { success: false, error: invalid };

    // The backend snapshots fresh fields into every hero that references
    // this badge and reports how many documents it touched.
    const res = await api.patch<{
      data: { badge: any; syncedHeroes: number };
    }>(`/trust-badges/${encodeURIComponent(id)}`, input);

    return {
      success: true,
      data: {
        badge: serialize(res.data?.data?.badge),
        syncedHeroes: res.data?.data?.syncedHeroes ?? 0,
      },
      message: "Badge updated",
    };
  } catch (err: any) {
    if (isAxiosError(err) && err.response?.status === 404) {
      return { success: false, error: "Badge not found" };
    }
    console.error("[updateTrustBadge] Failed:", err);
    return {
      success: false,
      error: errorMessage(err, "Failed to update badge"),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Delete (block if in use, unless force)                             */
/* ------------------------------------------------------------------ */

/** DELETE /api/trust-badges/:id — admin only */
export async function deleteTrustBadge(
  id: string,
  opts?: { force?: boolean },
): Promise<ActionResult<{ affectedHeroes: number }>> {
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid badge id" };
    }

    const res = await api.delete<{ data: { affectedHeroes: number } }>(
      `/trust-badges/${encodeURIComponent(id)}`,
      { params: opts?.force ? { force: "true" } : undefined },
    );

    return {
      success: true,
      data: { affectedHeroes: res.data?.data?.affectedHeroes ?? 0 },
      message: "Badge deleted",
    };
  } catch (err: any) {
    console.error("[deleteTrustBadge] Failed:", err);
    if (isAxiosError(err) && err.response?.status === 404) {
      return { success: false, error: "Badge not found" };
    }
    return {
      success: false,
      error: errorMessage(err, "Failed to delete badge"),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Reorder                                                            */
/* ------------------------------------------------------------------ */

/** POST /api/trust-badges/reorder — admin only */
export async function reorderTrustBadges(
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    if (!Array.isArray(orderedIds)) {
      return { success: false, error: "orderedIds must be an array" };
    }
    const valid = orderedIds.filter((id) => isValidObjectId(id));
    if (valid.length === 0) return { success: true, data: null };

    await api.post("/trust-badges/reorder", { orderedIds: valid });
    return { success: true, data: null, message: "Order updated" };
  } catch (err: any) {
    console.error("[reorderTrustBadges] Failed:", err);
    return { success: false, error: errorMessage(err, "Failed to reorder") };
  }
}

/* ------------------------------------------------------------------ */
/*  Manual resync (exposed for the "Sync X heroes" prompt)             */
/* ------------------------------------------------------------------ */

/** POST /api/trust-badges/:id/resync — admin only */
export async function resyncTrustBadgeInHeroes(
  id: string,
): Promise<ActionResult<{ syncedHeroes: number }>> {
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid badge id" };
    }

    const res = await api.post<{ data: { syncedHeroes: number } }>(
      `/trust-badges/${encodeURIComponent(id)}/resync`,
    );

    return {
      success: true,
      data: { syncedHeroes: res.data?.data?.syncedHeroes ?? 0 },
      message: "Heroes synced",
    };
  } catch (err: any) {
    if (isAxiosError(err) && err.response?.status === 404) {
      return { success: false, error: "Badge not found" };
    }
    console.error("[resyncTrustBadgeInHeroes] Failed:", err);
    return { success: false, error: errorMessage(err, "Failed to sync") };
  }
}
