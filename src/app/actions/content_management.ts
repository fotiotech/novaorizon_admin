// app/actions/content_management.ts
"use server";
import { requireAdmin } from "@/lib/authz";

import { connection } from "@/utils/connection";
import HeroContent, { ITrustBadge } from "@/models/HeroContent";
import TrustBadge from "@/models/TrustBadge";
import { revalidatePath, updateTag } from "next/cache";
import { deleteS3Object } from "./s3";
import mongoose from "mongoose";

/* ------------------------------------------------------------------ */
/*  Parsing — resolves library refs to fresh snapshots                 */
/* ------------------------------------------------------------------ */
/**
 * Parses trust badges from FormData.
 *
 * - Missing field        → empty array (valid).
 * - Invalid JSON         → error.
 * - Library references   → replaced with a fresh snapshot pulled from the
 *                          `TrustBadge` collection (batch query, no N+1).
 * - Inactive/missing ref → gracefully degrades to an ad-hoc snapshot using
 *                          whatever fields the client sent. This keeps the
 *                          hero rendering identically even after a library
 *                          badge is archived or force-deleted.
 * - Ad-hoc badges        → kept as-is.
 * - Entries lacking `icon` or `title` are silently dropped.
 */
async function parseTrustBadges(
  raw: FormDataEntryValue | null,
): Promise<
  { ok: true; badges: ITrustBadge[] } | { ok: false; message: string }
> {
  if (!raw) return { ok: true, badges: [] };

  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) {
      return { ok: false, message: "Invalid trust badges data" };
    }

    // Collect library ids for a single batched fetch.
    const ids = parsed
      .map((b: any) => b?.badgeId)
      .filter((id: any) => id && mongoose.Types.ObjectId.isValid(String(id)));

    const library = ids.length
      ? await TrustBadge.find({ _id: { $in: ids } }).lean()
      : [];
    const libMap = new Map(library.map((b: any) => [String(b._id), b]));

    const badges: ITrustBadge[] = [];

    for (const b of parsed) {
      if (!b || !b.icon || !b.title) continue;

      if (b.badgeId) {
        const lib = libMap.get(String(b.badgeId));

        if (lib && lib.isActive) {
          // Fresh snapshot from the library — this is the source of truth
          // whenever the client says "this is badge X".
          badges.push({
            badgeId: lib._id as mongoose.Types.ObjectId,
            icon: lib.icon,
            title: lib.title,
            description: lib.description ?? "",
            popupText: lib.popupText ?? "",
            link: lib.link ?? "",
          });
          continue;
        }

        // Referenced badge is gone or archived → keep the client's snapshot,
        // drop the ref so this badge simply becomes ad-hoc.
        badges.push({
          badgeId: null,
          icon: String(b.icon).trim(),
          title: String(b.title).trim(),
          description: b.description ? String(b.description).trim() : "",
          popupText: b.popupText ? String(b.popupText).trim() : "",
          link: b.link ? String(b.link).trim() : "",
        });
        continue;
      }

      // Ad-hoc badge — no library involvement.
      badges.push({
        badgeId: null,
        icon: String(b.icon).trim(),
        title: String(b.title).trim(),
        description: b.description ? String(b.description).trim() : "",
        popupText: b.popupText ? String(b.popupText).trim() : "",
        link: b.link ? String(b.link).trim() : "",
      });
    }

    return { ok: true, badges };
  } catch {
    return { ok: false, message: "Invalid trust badges data" };
  }
}

/* ------------------------------------------------------------------ */
/*  Serialization — safe across the RSC boundary                       */
/* ------------------------------------------------------------------ */
/**
 * Mongoose returns ObjectIds and Dates that can't cross the RSC boundary.
 * This flattens them into plain strings, and normalizes `trustBadges` so
 * the client always receives the same shape regardless of whether the
 * document uses the old (inline-only) or new (badgeId-aware) schema.
 */
function serializeHero(res: any) {
  return {
    ...res,
    _id: res._id?.toString(),
    created_at:
      res.created_at instanceof Date
        ? res.created_at.toISOString()
        : (res.created_at ?? null),
    updated_at:
      res.updated_at instanceof Date
        ? res.updated_at.toISOString()
        : (res.updated_at ?? null),
    trustBadges: (res.trustBadges ?? []).map((b: any) => ({
      badgeId: b.badgeId ? String(b.badgeId) : null,
      icon: b.icon ?? "",
      title: b.title ?? "",
      description: b.description ?? "",
      popupText: b.popupText ?? "",
      link: b.link ?? "",
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */
export async function findHeroContent() {
  try {
    await connection();
    const heroContent = await HeroContent.find()
      .sort({ created_at: -1 })
      .lean();
    return heroContent.map(serializeHero);
  } catch (error) {
    console.error("Error fetching hero content:", error);
    throw new Error("Failed to fetch hero content");
  }
}

export async function findHeroContentById(id: string) {
  try {
    await connection();
    if (!id) throw new Error("ID is required");

    const res = await HeroContent.findById(id).lean();
    if (!res) throw new Error("Hero content not found");

    return serializeHero(res);
  } catch (error) {
    console.error("Error fetching hero content by ID:", error);
    throw new Error("Failed to fetch hero content");
  }
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */
export async function createHeroContent(prevState: any, formData: FormData) {
  await requireAdmin();
  try {
    await connection();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const cta_text = formData.get("cta_text") as string;
    const cta_link = formData.get("cta_link") as string;
    const imageUrl = formData.get("imageUrl") as string;

    // Validation
    if (!title || !description || !cta_text || !cta_link || !imageUrl) {
      return {
        success: false,
        message: "All fields are required",
      };
    }

    const parsedBadges = await parseTrustBadges(formData.get("trustBadges"));
    if (!parsedBadges.ok) {
      return { success: false, message: parsedBadges.message };
    }

    const newHeroContent = new HeroContent({
      title,
      description,
      imageUrl,
      cta_text,
      cta_link,
      trustBadges: parsedBadges.badges,
    });

    await newHeroContent.save();
    revalidatePath("/");
    revalidatePath("/channels/store/content/hero");
    // Library usage counts change → refresh the badges admin page too.
    revalidatePath("/channels/store/content/trust_badges");
    return {
      success: true,
      message: "Hero content created successfully",
    };
  } catch (error) {
    console.error("Error creating hero content:", error);
    return {
      success: false,
      message: "Failed to create hero content",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Update                                                             */
/* ------------------------------------------------------------------ */
export async function updateHeroContent(
  id: string,
  prevState: any,
  formData: FormData,
) {
  await requireAdmin();
  try {
    await connection();

    if (!id) {
      return {
        success: false,
        message: "ID is required for update",
      };
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const cta_text = formData.get("cta_text") as string;
    const cta_link = formData.get("cta_link") as string;
    const imageUrl = formData.get("imageUrl") as string;

    // Validation
    if (!title || !description || !cta_text || !cta_link || !imageUrl) {
      return {
        success: false,
        message: "All fields are required",
      };
    }

    const parsedBadges = await parseTrustBadges(formData.get("trustBadges"));
    if (!parsedBadges.ok) {
      return { success: false, message: parsedBadges.message };
    }

    const updatedContent = await HeroContent.findByIdAndUpdate(
      id,
      {
        title,
        description,
        imageUrl,
        cta_text,
        cta_link,
        trustBadges: parsedBadges.badges,
        updated_at: Date.now(),
      },
      { new: true, runValidators: true },
    );

    if (!updatedContent) {
      return {
        success: false,
        message: "Hero content not found",
      };
    }

    revalidatePath("/");
    revalidatePath("/channels/store/content/hero");
    // Library usage counts change → refresh the badges admin page too.
    revalidatePath("/channels/store/content/trust_badges");

    return {
      success: true,
      message: "Hero content updated successfully",
    };
  } catch (error) {
    console.error("Error updating hero content:", error);
    return {
      success: false,
      message: "Failed to update hero content",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Delete                                                             */
/* ------------------------------------------------------------------ */
export async function deleteHeroContent(id: string) {
  await requireAdmin();
  try {
    await connection();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid hero ID" };
    }

    const hero = await HeroContent.findById(id);
    if (!hero) {
      return { success: false, error: "Hero content not found" };
    }

    // Delete the image from S3 if it exists
    if (hero.imageUrl) {
      await deleteS3Object(hero.imageUrl);
    }

    // Delete the document
    await hero.deleteOne();

    revalidatePath("/");
    revalidatePath("/channels/store/content/hero");
    // Library usage counts change → refresh the badges admin page too.
    revalidatePath("/channels/store/content/trust_badges");
    return { success: true, message: "Hero content deleted successfully" };
  } catch (error) {
    console.error("Error deleting hero content:", error);
    return { success: false, error: "Failed to delete hero content" };
  }
}

/* ------------------------------------------------------------------ */
/*  Image deletion (unchanged behaviour)                               */
/* ------------------------------------------------------------------ */
export async function deleteHeroImage(heroId: string, fileUrl: string) {
  await requireAdmin();
  try {
    await connection();

    if (!mongoose.Types.ObjectId.isValid(heroId)) {
      return { success: false, error: "Invalid hero ID" };
    }
    if (!fileUrl) {
      return { success: false, error: "No image URL provided" };
    }

    const hero = await HeroContent.findById(heroId);
    if (!hero) {
      return { success: false, error: "Hero not found" };
    }

    // Delete the S3 object the user clicked. We intentionally do NOT touch
    // `hero.imageUrl` here — the schema requires at least one image, and the
    // form submit (updateHeroContent) is the single writer that persists the
    // replacement URL from local state.
    await deleteS3Object(fileUrl);

    return { success: true, message: "Image removed successfully" };
  } catch (error) {
    console.error("Error deleting hero image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}
