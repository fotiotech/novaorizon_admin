// app/actions/editorial-content.ts
"use server";
import { requireAdmin } from "@/lib/authz";
import { revalidatePath, updateTag } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { EditorialContent } from "@/models/EditorialContent";
import { Block } from "@/models/Block";
import { CTA_STYLES } from "@/lib/content/constants";

const LIST_PATH = "/channels/store/content/editorials";

/* -------------------------------------------------------------------------- */
/*                                  types                                     */
/* -------------------------------------------------------------------------- */

export interface EditorialListItem {
  _id: string;
  name: string;
  imageUrl: string | null;
  imageCount: number;
  updated_at: string;
}

export interface EditorialOption {
  value: string;
  label: string;
  image: string | null;
  imageCount: number;
}

export interface EditorialPreview {
  _id: string;
  name: string;
  imageUrl: string | null;
  imageCount: number;
}

export type EditorialPreviewResult =
  | { success: true; data: EditorialPreview }
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

function readStringArray(fd: FormData, key: string, limit = 40): string[] {
  try {
    const raw = fd.get(key);
    if (!raw) return [];
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.trim() !== "")
      .slice(0, limit);
  } catch {
    return [];
  }
}

function parseEditorialForm(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" as const };

  const heading = {
    title: String(fd.get("heading.title") ?? "").trim(),
    subtitle: String(fd.get("heading.subtitle") ?? "").trim(),
  };
  const eyebrow = String(fd.get("eyebrow") ?? "").trim();
  const body = String(fd.get("body") ?? "");
  const image = String(fd.get("image") ?? "").trim();
  const secondaryImage = String(fd.get("secondaryImage") ?? "").trim();
  const images = readStringArray(fd, "images");

  const cta = {
    text: String(fd.get("cta.text") ?? "").trim(),
    link: String(fd.get("cta.link") ?? "").trim(),
    style: pickEnum(fd.get("cta.style"), CTA_STYLES, "none"),
  };

  const hasAnyContent =
    Boolean(heading.title) ||
    Boolean(body) ||
    Boolean(image) ||
    images.length > 0;

  if (!hasAnyContent) {
    return {
      error: "Editorial needs at least a headline, body, or image." as const,
    };
  }

  if (cta.style !== "none" && (!cta.text || !cta.link)) {
    return { error: "CTA requires both text and link" as const };
  }

  return {
    doc: {
      name,
      eyebrow,
      body,
      image,
      secondaryImage,
      images,
      heading,
      cta,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                  reads                                     */
/* -------------------------------------------------------------------------- */

export async function listEditorials(): Promise<{
  success: true;
  data: EditorialListItem[];
}> {
  await requireAdmin();
  await connection();
  const docs = await EditorialContent.find().sort({ updated_at: -1 }).lean();

  return {
    success: true,
    data: (docs as any[]).map((d) => ({
      _id: String(d._id),
      name: d.name,
      imageUrl:
        d.image ||
        (Array.isArray(d.images) && d.images.length > 0 ? d.images[0] : null),
      imageCount: Array.isArray(d.images) ? d.images.length : 0,
      updated_at: new Date(d.updated_at).toISOString(),
    })),
  };
}

export async function getEditorial(id: string) {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false as const, error: "Invalid ID" };
  }
  await connection();
  const doc = await EditorialContent.findById(id).lean();
  if (!doc) return { success: false as const, error: "Not found" };
  return { success: true as const, data: JSON.parse(JSON.stringify(doc)) };
}

/** Picker options — used by the block form. */
export async function fetchEditorialOptions(
  search?: string,
): Promise<EditorialOption[]> {
  await requireAdmin();
  await connection();

  const filter: Record<string, any> = {};
  if (search && search.trim()) {
    filter.name = { $regex: search.trim(), $options: "i" };
  }

  const docs = await EditorialContent.find(filter)
    .select("_id name image images")
    .sort({ updated_at: -1 })
    .limit(50)
    .lean();

  return (docs as any[]).map((d) => ({
    value: String(d._id),
    label: d.name,
    image:
      d.image ||
      (Array.isArray(d.images) && d.images.length > 0 ? d.images[0] : null),
    imageCount: Array.isArray(d.images) ? d.images.length : 0,
  }));
}

/** Preview card for a block that references this editorial. */
export async function getEditorialPreview(
  id: string,
): Promise<EditorialPreviewResult> {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, error: "Invalid ID" };
  }
  await connection();

  const doc: any = await EditorialContent.findById(id)
    .select("name image images")
    .lean();
  if (!doc) return { success: false, error: "Not found", missing: true };

  return {
    success: true,
    data: {
      _id: String(doc._id),
      name: doc.name,
      imageUrl:
        doc.image ||
        (Array.isArray(doc.images) && doc.images.length > 0
          ? doc.images[0]
          : null),
      imageCount: Array.isArray(doc.images) ? doc.images.length : 0,
    },
  };
}

/** How many blocks reference this editorial — used to block deletion. */
export async function countEditorialUsage(id: string): Promise<number> {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id)) return 0;
  await connection();
  return Block.countDocuments({ "source.editorialId": id });
}

/* -------------------------------------------------------------------------- */
/*                                  writes                                    */
/* -------------------------------------------------------------------------- */

export async function createEditorial(formData: FormData) {
  await requireAdmin();
  const parsed = parseEditorialForm(formData);
  if ("error" in parsed) {
    return { success: false as const, message: parsed.error };
  }

  try {
    await connection();
    const doc = new EditorialContent(parsed.doc);
    await doc.save();
    revalidatePath(LIST_PATH);
    // No blocks reference this yet — nothing in the storefront to refresh.
    return {
      success: true as const,
      message: "Editorial created",
      data: JSON.parse(JSON.stringify(doc.toObject())),
    };
  } catch (err: any) {
    console.error("[createEditorial]", err);
    return {
      success: false as const,
      message: err?.message ?? "Failed to create editorial",
    };
  }
}

export async function updateEditorial(id: string, formData: FormData) {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false as const, message: "Invalid ID" };
  }
  const parsed = parseEditorialForm(formData);
  if ("error" in parsed) {
    return { success: false as const, message: parsed.error };
  }

  try {
    await connection();
    const updated = await EditorialContent.findByIdAndUpdate(id, parsed.doc, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return { success: false as const, message: "Editorial not found" };
    }
    revalidatePath(LIST_PATH);
    // Every block that references this editorial needs to refresh.
    updateTag("blocks");
    updateTag("editorials");
    return {
      success: true as const,
      message: "Editorial updated",
      data: JSON.parse(JSON.stringify(updated.toObject())),
    };
  } catch (err: any) {
    console.error("[updateEditorial]", err);
    return {
      success: false as const,
      message: err?.message ?? "Failed to update editorial",
    };
  }
}

export async function deleteEditorial(id: string) {
  await requireAdmin();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false as const, error: "Invalid ID" };
  }

  try {
    await connection();
    const usage = await Block.countDocuments({ "source.editorialId": id });
    if (usage > 0) {
      return {
        success: false as const,
        error: `Cannot delete: ${usage} block${usage === 1 ? "" : "s"} still reference this editorial. Remove those references first.`,
      };
    }
    const deleted = await EditorialContent.findByIdAndDelete(id);
    if (!deleted) {
      return { success: false as const, error: "Editorial not found" };
    }
    revalidatePath(LIST_PATH);
    return { success: true as const, message: "Editorial deleted" };
  } catch (err: any) {
    console.error("[deleteEditorial]", err);
    return {
      success: false as const,
      error: err?.message ?? "Failed to delete editorial",
    };
  }
}
