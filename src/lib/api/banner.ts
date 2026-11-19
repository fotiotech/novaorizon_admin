// lib/api/banner.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";
import {
  BANNER_ALIGNS,
  BANNER_CARD_SIZES,
  BANNER_RATIOS,
  BANNER_OVERLAYS,
  BANNER_POSITIONS,
  BANNER_STATUSES,
  BANNER_THEMES,
  BANNER_TYPES,
  CTA_STYLES,
} from "@/lib/content/constants";

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
  type: (typeof BANNER_TYPES)[number];
  status: (typeof BANNER_STATUSES)[number];
  order: number;
  imageUrl: string | null;
  startAt: string | null;
  endAt: string | null;
  updated_at: string;
}

export interface BannerOption {
  value: string;
  label: string;
  image: string | null;
  type: (typeof BANNER_TYPES)[number];
  status: (typeof BANNER_STATUSES)[number];
}

export interface BannerPreview {
  _id: string;
  name: string;
  type: (typeof BANNER_TYPES)[number];
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

  const type = pickEnum(fd.get("type"), BANNER_TYPES, "image");

  const heading = {
    title: String(fd.get("heading.title") ?? "").trim(),
    subtitle: String(fd.get("heading.subtitle") ?? "").trim(),
  };
  const eyebrow = String(fd.get("eyebrow") ?? "").trim();
  const body = String(fd.get("body") ?? "");

  const image = String(fd.get("image") ?? "").trim();
  const imageAlt = String(fd.get("imageAlt") ?? "").trim();
  const videoUrl = String(fd.get("videoUrl") ?? "").trim();
  const html = String(fd.get("html") ?? "");

  // The media requirement depends on the banner type.
  if (type === "image" && !image) {
    return { error: "Image banners need an image." as const };
  }
  if (type === "video" && !videoUrl) {
    return { error: "Video banners need a video URL." as const };
  }
  if (type === "html" && !html.trim()) {
    return { error: "HTML banners need their markup." as const };
  }
  if (type === "compact" && !image) {
    return { error: "Compact banners need a logo image." as const };
  }
  if (type === "compact" && !heading.title) {
    return { error: "Compact banners need a title." as const };
  }

  const cta = {
    text: String(fd.get("cta.text") ?? "").trim(),
    link: String(fd.get("cta.link") ?? "").trim(),
    style: pickEnum(fd.get("cta.style"), CTA_STYLES, "none"),
  };
  if (cta.style !== "none" && !cta.link) {
    return { error: "CTA requires a link" as const };
  }

  const date = (key: string): string | null => {
    const v = String(fd.get(key) ?? "").trim();
    return v ? v : null;
  };

  const startAt = date("startAt");
  const endAt = date("endAt");
  if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
    return { error: "The schedule ends before it starts." as const };
  }

  return {
    doc: {
      type,
      name,
      eyebrow,
      body,
      heading,
      image,
      imageAlt,
      videoUrl,
      html,
      link: String(fd.get("link") ?? "").trim(),
      openInNewTab: String(fd.get("openInNewTab") ?? "") === "true",
      overlay: pickEnum(fd.get("overlay"), BANNER_OVERLAYS, "gradient"),
      ratio: pickEnum(fd.get("ratio"), BANNER_RATIOS, "1:1"),
      size: pickEnum(fd.get("size"), BANNER_CARD_SIZES, "md"),
      align: pickEnum(fd.get("align"), BANNER_ALIGNS, "left"),
      position: pickEnum(fd.get("position"), BANNER_POSITIONS, "center"),
      theme: pickEnum(fd.get("theme"), BANNER_THEMES, "light"),
      status: pickEnum(fd.get("status"), BANNER_STATUSES, "active"),
      order: Math.max(0, Number(fd.get("order")) || 0),
      startAt,
      endAt,
      cta,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                              error normalisation                           */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                  reads                                     */
/* -------------------------------------------------------------------------- */

/** GET /api/banners — admin only */
export async function listBanners(): Promise<{
  success: true;
  data: BannerListItem[];
}> {
  const res = await api.get<{ data: any[] }>("/banners");
  const docs = Array.isArray(res.data?.data) ? res.data.data : [];

  return {
    success: true,
    data: docs.map((d) => ({
      _id: String(d._id),
      name: d.name,
      type: (d.type ?? "image") as BannerListItem["type"],
      status: (d.status ?? "active") as BannerListItem["status"],
      order: Number(d.order) || 0,
      imageUrl: d.imageUrl || d.image || null,
      startAt: d.startAt ?? null,
      endAt: d.endAt ?? null,
      updated_at: d.updated_at ? new Date(d.updated_at).toISOString() : "",
    })),
  };
}

/** GET /api/banners/:id — admin only */
export async function getBanner(id: string) {
  if (!isValidObjectId(id)) {
    return { success: false as const, error: "Invalid ID" };
  }
  try {
    const res = await api.get<{ data: any }>(
      `/banners/${encodeURIComponent(id)}`,
    );
    return { success: true as const, data: res.data?.data };
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) {
      return { success: false as const, error: "Not found" };
    }
    throw err;
  }
}

/** GET /api/banners/options — admin only */
export async function fetchBannerOptions(
  search?: string,
): Promise<BannerOption[]> {
  const res = await api.get<{ data: BannerOption[] }>("/banners/options", {
    params:
      search && search.trim() ? { search: search.trim() } : undefined,
  });
  const docs = Array.isArray(res.data?.data) ? res.data.data : [];

  return docs.map((d) => ({
    value: String(d.value),
    label: d.label,
    image: d.image || null,
    type: (d.type ?? "image") as BannerOption["type"],
    status: (d.status ?? "active") as BannerOption["status"],
  }));
}

/** GET /api/banners/:id/preview — admin only */
export async function getBannerPreview(
  id: string,
): Promise<BannerPreviewResult> {
  if (!isValidObjectId(id)) {
    return { success: false, error: "Invalid ID" };
  }

  try {
    const res = await api.get<{ data: BannerPreview }>(
      `/banners/${encodeURIComponent(id)}/preview`,
    );
    return { success: true, data: res.data?.data };
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) {
      return { success: false, error: "Not found", missing: true };
    }
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/*                                  writes                                    */
/* -------------------------------------------------------------------------- */

/** POST /api/banners — admin only */
export async function createBanner(formData: FormData) {
  const parsed = parseBannerForm(formData);
  if ("error" in parsed) {
    return { success: false as const, message: parsed.error };
  }

  try {
    const res = await api.post<{ data: any }>("/banners", parsed.doc);
    return {
      success: true as const,
      message: "Banner created",
      data: res.data?.data,
    };
  } catch (err: any) {
    console.error("[createBanner]", err);
    return {
      success: false as const,
      message: errorMessage(err, "Failed to create banner"),
    };
  }
}

/** PATCH /api/banners/:id — admin only */
export async function updateBanner(id: string, formData: FormData) {
  if (!isValidObjectId(id)) {
    return { success: false as const, message: "Invalid ID" };
  }
  const parsed = parseBannerForm(formData);
  if ("error" in parsed) {
    return { success: false as const, message: parsed.error };
  }

  try {
    const res = await api.patch<{ data: any }>(
      `/banners/${encodeURIComponent(id)}`,
      parsed.doc,
    );
    return {
      success: true as const,
      message: "Banner updated",
      data: res.data?.data,
    };
  } catch (err: any) {
    console.error("[updateBanner]", err);
    if (isAxiosError(err) && err.response?.status === 404) {
      return { success: false as const, message: "Banner not found" };
    }
    return {
      success: false as const,
      message: errorMessage(err, "Failed to update banner"),
    };
  }
}

/** DELETE /api/banners/:id — admin only */
export async function deleteBanner(id: string) {
  if (!isValidObjectId(id)) {
    return { success: false as const, error: "Invalid ID" };
  }

  try {
    await api.delete(`/banners/${encodeURIComponent(id)}`);
    return { success: true as const, message: "Banner deleted" };
  } catch (err: any) {
    console.error("[deleteBanner]", err);
    if (isAxiosError(err) && err.response?.status === 404) {
      return { success: false as const, error: "Banner not found" };
    }
    return {
      success: false as const,
      error: errorMessage(err, "Failed to delete banner"),
    };
  }
}