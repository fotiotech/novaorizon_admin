// app/actions/banner-content.ts
"use server";
import { requireAdmin } from "@/lib/authz";
import { revalidatePath, updateTag } from "next/cache";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";
import { CTA_STYLES } from "@/lib/content/constants";

const LIST_PATH = "/channels/store/content/banners";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: unknown): boolean {
  return typeof id === "string" && OBJECT_ID_RE.test(id);
}

/* -------------------------------------------------------------------------- */
/*                                  types                                     */
/* -------------------------------------------------------------------------- */

export interface BannerListItem {
  _id: string;
  name: string;
  imageUrl: string | null;
  updated_at: string;
}

export interface BannerOption {
  value: string;
  label: string;
  image: string | null;
}

export interface BannerPreview {
  _id: string;
  name: string;
  imageUrl: string | null;
}

export type BannerPreviewResult =
  | { success: true; data: BannerPreview }
  | { success: false; error: string; missing?: boolean };

/* -------------------------------------------------------------------------- */
/*                                  parsing                                   */
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

function parseBannerForm(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" as const };

  const heading = {
    title: String(fd.get("heading.title") ?? "").trim(),
    subtitle: String(fd.get("heading.subtitle") ?? "").trim(),
  };
  const eyebrow = String(fd.get("eyebrow") ?? "").trim();
  const body = String(fd.get("body") ?? "");
  const image = String(fd.get("image") ?? "").trim();

  const cta = {
    text: String(fd.get("cta.text") ?? "").trim(),
    link: String(fd.get("cta.link") ?? "").trim(),
    style: pickEnum(fd.get("cta.style"), CTA_STYLES, "none"),
  };

  const hasAnyContent =
    Boolean(heading.title) || Boolean(body) || Boolean(image);

  if (!hasAnyContent) {
    return {
      error: "Banner needs at least a headline, body, or image." as const,
    };
  }

  // CTA: link is required when a style is chosen; text is optional.
  if (cta.style !== "none" && !cta.link) {
    return { error: "CTA requires a link" as const };
  }

  return {
    doc: { name, eyebrow, body, image, heading, cta },
  };
}

/* -------------------------------------------------------------------------- */
/*                                  reads                                     */
/* -------------------------------------------------------------------------- */

export async function listBanners(): Promise<{
  success: true;
  data: BannerListItem[];
}> {
  await requireAdmin();
  const docs = await apiData<any[]>("/banners");

  return {
    success: true,
    data: (docs ?? []).map((d) => ({
      _id: String(d._id),
      name: d.name,
      imageUrl: d.imageUrl || null,
      updated_at: d.updated_at ? new Date(d.updated_at).toISOString() : "",
    })),
  };
}

export async function getBanner(id: string) {
  await requireAdmin();
  if (!isValidObjectId(id)) {
    return { success: false as const, error: "Invalid ID" };
  }
  try {
    const doc = await apiData<any>(`/banners/${encodeURIComponent(id)}`);
    return { success: true as const, data: doc };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: false as const, error: "Not found" };
    }
    throw err;
  }
}

export async function fetchBannerOptions(
  search?: string,
): Promise<BannerOption[]> {
  await requireAdmin();
  const docs = await apiData<BannerOption[]>("/banners/options", {
    query: search && search.trim() ? { search: search.trim() } : undefined,
  });
  return (docs ?? []).map((d) => ({
    value: String(d.value),
    label: d.label,
    image: d.image || null,
  }));
}

export async function getBannerPreview(
  id: string,
): Promise<BannerPreviewResult> {
  await requireAdmin();
  if (!isValidObjectId(id)) {
    return { success: false, error: "Invalid ID" };
  }

  try {
    const data = await apiData<BannerPreview>(
      `/banners/${encodeURIComponent(id)}/preview`,
    );
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: false, error: "Not found", missing: true };
    }
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/*                                  writes                                    */
/* -------------------------------------------------------------------------- */

export async function createBanner(formData: FormData) {
  await requireAdmin();
  const parsed = parseBannerForm(formData);
  if ("error" in parsed) {
    return { success: false as const, message: parsed.error };
  }

  try {
    const doc = await apiData<any>("/banners", {
      method: "POST",
      body: parsed.doc,
    });
    revalidatePath(LIST_PATH);
    return {
      success: true as const,
      message: "Banner created",
      data: doc,
    };
  } catch (err: any) {
    console.error("[createBanner]", err);
    return {
      success: false as const,
      message: err?.message ?? "Failed to create banner",
    };
  }
}

export async function updateBanner(id: string, formData: FormData) {
  await requireAdmin();
  if (!isValidObjectId(id)) {
    return { success: false as const, message: "Invalid ID" };
  }
  const parsed = parseBannerForm(formData);
  if ("error" in parsed) {
    return { success: false as const, message: parsed.error };
  }

  try {
    const updated = await apiData<any>(`/banners/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: parsed.doc,
    });
    revalidatePath(LIST_PATH);
    updateTag("blocks");
    updateTag("banners");
    return {
      success: true as const,
      message: "Banner updated",
      data: updated,
    };
  } catch (err: any) {
    console.error("[updateBanner]", err);
    if (err instanceof ApiError && err.status === 404) {
      return { success: false as const, message: "Banner not found" };
    }
    return {
      success: false as const,
      message: err?.message ?? "Failed to update banner",
    };
  }
}

export async function deleteBanner(id: string) {
  await requireAdmin();
  if (!isValidObjectId(id)) {
    return { success: false as const, error: "Invalid ID" };
  }

  try {
    await apiFetch(`/banners/${encodeURIComponent(id)}`, { method: "DELETE" });
    revalidatePath(LIST_PATH);
    return { success: true as const, message: "Banner deleted" };
  } catch (err: any) {
    console.error("[deleteBanner]", err);
    if (err instanceof ApiError && err.status === 404) {
      return { success: false as const, error: "Banner not found" };
    }
    return {
      success: false as const,
      error: err?.message ?? "Failed to delete banner",
    };
  }
}
