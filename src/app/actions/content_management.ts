// app/actions/content_management.ts
"use server";
import { requireAdmin } from "@/lib/authz";

import { revalidatePath } from "next/cache";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: unknown): boolean {
  return typeof id === "string" && OBJECT_ID_RE.test(id);
}

/* ------------------------------------------------------------------ */
/*  Trust badges                                                       */
/* ------------------------------------------------------------------ */
/**
 * Reads the trust badges out of the submitted form.
 *
 * The backend resolves library references to fresh snapshots (batch query,
 * no N+1), degrades archived/missing references to ad-hoc snapshots and
 * drops entries lacking `icon` or `title`, so this only has to forward the
 * parsed JSON payload.
 */
function parseTrustBadges(
  raw: FormDataEntryValue | null,
):
  | { ok: true; badges: any[] }
  | { ok: false; message: string } {
  if (!raw) return { ok: true, badges: [] };

  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) {
      return { ok: false, message: "Invalid trust badges data" };
    }
    return { ok: true, badges: parsed };
  } catch {
    return { ok: false, message: "Invalid trust badges data" };
  }
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */
export async function findHeroContent() {
  try {
    const heroes = await apiData<any[]>("/hero-content");
    return heroes ?? [];
  } catch (error) {
    console.error("Error fetching hero content:", error);
    throw new Error("Failed to fetch hero content");
  }
}

export async function findHeroContentById(id: string) {
  try {
    if (!id) throw new Error("ID is required");

    const res = await apiData<any>("/hero-content/" + encodeURIComponent(id));
    if (!res) throw new Error("Hero content not found");

    return res;
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

    const parsedBadges = parseTrustBadges(formData.get("trustBadges"));
    if (!parsedBadges.ok) {
      return { success: false, message: parsedBadges.message };
    }

    await apiFetch("/hero-content", {
      method: "POST",
      body: {
        title,
        description,
        imageUrl,
        cta_text,
        cta_link,
        trustBadges: parsedBadges.badges,
      },
    });

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

    const parsedBadges = parseTrustBadges(formData.get("trustBadges"));
    if (!parsedBadges.ok) {
      return { success: false, message: parsedBadges.message };
    }

    try {
      await apiFetch(`/hero-content/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: {
          title,
          description,
          imageUrl,
          cta_text,
          cta_link,
          trustBadges: parsedBadges.badges,
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return {
          success: false,
          message: "Hero content not found",
        };
      }
      throw err;
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
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid hero ID" };
    }

    try {
      // The backend also removes the hero's image from S3.
      await apiFetch(`/hero-content/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return { success: false, error: "Hero content not found" };
      }
      throw err;
    }

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
    if (!isValidObjectId(heroId)) {
      return { success: false, error: "Invalid hero ID" };
    }
    if (!fileUrl) {
      return { success: false, error: "No image URL provided" };
    }

    try {
      // Deletes the S3 object the user clicked. The backend intentionally
      // does NOT touch `hero.imageUrl` — the form submit is the single
      // writer that persists the replacement URL from local state.
      await apiFetch(
        `/hero-content/${encodeURIComponent(heroId)}/images/delete`,
        {
          method: "POST",
          body: { fileUrl },
        },
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return { success: false, error: "Hero not found" };
      }
      throw err;
    }

    return { success: true, message: "Image removed successfully" };
  } catch (error) {
    console.error("Error deleting hero image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}
