// lib/api/hero-content.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: unknown): boolean {
  return typeof id === "string" && OBJECT_ID_RE.test(id);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
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

function readHeroForm(formData: FormData) {
  return {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    cta_text: formData.get("cta_text") as string,
    cta_link: formData.get("cta_link") as string,
    imageUrl: formData.get("imageUrl") as string,
  };
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

/** GET /api/hero-content — admin only */
export async function findHeroContent() {
  try {
    const res = await api.get<{ data: any[] }>("/hero-content");
    return res.data?.data ?? [];
  } catch (error) {
    console.error("Error fetching hero content:", error);
    throw new Error("Failed to fetch hero content");
  }
}

/** GET /api/hero-content/:id — admin only */
export async function findHeroContentById(id: string) {
  try {
    if (!id) throw new Error("ID is required");

    const res = await api.get<{ data: any }>(
      "/hero-content/" + encodeURIComponent(id),
    );
    if (!res.data?.data) throw new Error("Hero content not found");

    return res.data.data;
  } catch (error) {
    console.error("Error fetching hero content by ID:", error);
    throw new Error("Failed to fetch hero content");
  }
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

/** POST /api/hero-content — admin only */
export async function createHeroContent(formData: FormData) {
  try {
    const { title, description, cta_text, cta_link, imageUrl } =
      readHeroForm(formData);

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

    await api.post("/hero-content", {
      title,
      description,
      imageUrl,
      cta_text,
      cta_link,
      trustBadges: parsedBadges.badges,
    });

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

/** PATCH /api/hero-content/:id — admin only */
export async function updateHeroContent(id: string, formData: FormData) {
  try {
    if (!id) {
      return {
        success: false,
        message: "ID is required for update",
      };
    }

    const { title, description, cta_text, cta_link, imageUrl } =
      readHeroForm(formData);

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
      await api.patch(`/hero-content/${encodeURIComponent(id)}`, {
        title,
        description,
        imageUrl,
        cta_text,
        cta_link,
        trustBadges: parsedBadges.badges,
      });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        return {
          success: false,
          message: "Hero content not found",
        };
      }
      throw err;
    }

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

/** DELETE /api/hero-content/:id — admin only */
export async function deleteHeroContent(id: string) {
  try {
    if (!isValidObjectId(id)) {
      return { success: false, error: "Invalid hero ID" };
    }

    try {
      // The backend also removes the hero's image from S3.
      await api.delete(`/hero-content/${encodeURIComponent(id)}`);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        return { success: false, error: "Hero content not found" };
      }
      throw err;
    }

    return { success: true, message: "Hero content deleted successfully" };
  } catch (error) {
    console.error("Error deleting hero content:", error);
    return { success: false, error: "Failed to delete hero content" };
  }
}

/* ------------------------------------------------------------------ */
/*  Image deletion                                                     */
/* ------------------------------------------------------------------ */

/** POST /api/hero-content/:id/images/delete — admin only */
export async function deleteHeroImage(heroId: string, fileUrl: string) {
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
      await api.post(
        `/hero-content/${encodeURIComponent(heroId)}/images/delete`,
        { fileUrl },
      );
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
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
