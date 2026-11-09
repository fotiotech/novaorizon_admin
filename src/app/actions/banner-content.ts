// app/actions/banner-content.ts
"use server";
import { requireAdmin } from "@/lib/authz";
import { revalidatePath, updateTag } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { BannerContent } from "@/models/BannerContent";
import { Block } from "@/models/Block";
import { CTA_STYLES } from "@/lib/content/constants";

const LIST_PATH = "/channels/store/content/banners";

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
  await connection();
  const docs = await BannerContent.find().sort({ updated_at: -1 }).lean();

  return {
    success: true,
    data: (docs as any[]).map((d) => ({
      _id: String(d._id),
      name: d.name,
      imageUrl: d.image || null,
      updated_at: new Date(d.updated_at).toISOString(),
    })),
  };
}

export async function getBanner(id: string) {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false as const, error: "Invalid ID" };
  }
  await connection();
  const doc = await BannerContent.findById(id).lean();
  if (!doc) return { success: false as const, error: "Not found" };
  return { success: true as const, data: JSON.parse(JSON.stringify(doc)) };
}

export async function fetchBannerOptions(
  search?: string,
): Promise<BannerOption[]> {
  await requireAdmin();
  await connection();

  const filter: Record<string, any> = {};
  if (search && search.trim()) {
    filter.name = { $regex: search.trim(), $options: "i" };
  }

  const docs = await BannerContent.find(filter)
    .select("_id name image")
    .sort({ updated_at: -1 })
    .limit(60)
    .lean();

  return (docs as any[]).map((d) => ({
    value: String(d._id),
    label: d.name,
    image: d.image || null,
  }));
}

export async function getBannerPreview(
  id: string,
): Promise<BannerPreviewResult> {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, error: "Invalid ID" };
  }
  await connection();

  const doc: any = await BannerContent.findById(id).select("name image").lean();
  if (!doc) return { success: false, error: "Not found", missing: true };

  return {
    success: true,
    data: {
      _id: String(doc._id),
      name: doc.name,
      imageUrl: doc.image || null,
    },
  };
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
    await connection();
    const doc = new BannerContent(parsed.doc);
    await doc.save();
    revalidatePath(LIST_PATH);
    return {
      success: true as const,
      message: "Banner created",
      data: JSON.parse(JSON.stringify(doc.toObject())),
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
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false as const, message: "Invalid ID" };
  }
  const parsed = parseBannerForm(formData);
  if ("error" in parsed) {
    return { success: false as const, message: parsed.error };
  }

  try {
    await connection();
    const updated = await BannerContent.findByIdAndUpdate(id, parsed.doc, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return { success: false as const, message: "Banner not found" };
    }
    revalidatePath(LIST_PATH);
    updateTag("blocks");
    updateTag("banners");
    return {
      success: true as const,
      message: "Banner updated",
      data: JSON.parse(JSON.stringify(updated.toObject())),
    };
  } catch (err: any) {
    console.error("[updateBanner]", err);
    return {
      success: false as const,
      message: err?.message ?? "Failed to update banner",
    };
  }
}

export async function deleteBanner(id: string) {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false as const, error: "Invalid ID" };
  }

  try {
    await connection();
    const usage = await Block.countDocuments({ "source.bannerIds": id });
    if (usage > 0) {
      return {
        success: false as const,
        error: `Cannot delete: ${usage} block${usage === 1 ? "" : "s"} still reference this banner. Remove those references first.`,
      };
    }
    const deleted = await BannerContent.findByIdAndDelete(id);
    if (!deleted) {
      return { success: false as const, error: "Banner not found" };
    }
    revalidatePath(LIST_PATH);
    return { success: true as const, message: "Banner deleted" };
  } catch (err: any) {
    console.error("[deleteBanner]", err);
    return {
      success: false as const,
      error: err?.message ?? "Failed to delete banner",
    };
  }
}
