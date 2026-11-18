// lib/api/page.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Field-level errors keyed the way the form renders them. */
export type PageFieldErrors = Record<string, string[]>;

export type PageActionResult = {
  errors?: PageFieldErrors;
  success?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Convert FormData to a plain object (repeated keys become arrays). */
function formDataToObject(formData: FormData): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "tags" || key === "metaKeywords") {
      if (!obj[key]) obj[key] = [];
      obj[key].push(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

function fieldErrors(err: any): PageFieldErrors | undefined {
  const raw = err?.response?.data?.fieldErrors;
  if (raw && typeof raw === "object") return raw as PageFieldErrors;
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

/** GET /api/pages — admin only */
export async function getPages(): Promise<any[]> {
  const res = await api.get<{ data: any[] }>("/pages");
  return res.data?.data ?? [];
}

/** GET /api/pages/:id — admin only */
export async function getPageById(id: string): Promise<any | null> {
  try {
    const res = await api.get<{ data: any }>(
      `/pages/${encodeURIComponent(id)}`,
    );
    return res.data?.data ?? null;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/** GET /api/pages/by-slug/:slug — public */
export async function getPageBySlug(slug: string): Promise<any | null> {
  try {
    const res = await api.get<{ data: any }>(
      `/pages/by-slug/${encodeURIComponent(slug)}`,
    );
    return res.data?.data ?? null;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  Writes                                                             */
/* ------------------------------------------------------------------ */

/** POST /api/pages — admin only */
export async function createPage(formData: FormData): Promise<PageActionResult> {
  const raw = formDataToObject(formData);
  // Coerce publishedAt to null when the field was left empty.
  if (raw.publishedAt === "") raw.publishedAt = null;

  try {
    await api.post("/pages", raw);
  } catch (error) {
    const errors = fieldErrors(error);
    if (errors) return { errors };
    console.error("Error creating page:", error);
    return { errors: { _form: ["Failed to create page."] } };
  }

  return { success: true };
}

/** PATCH /api/pages/:id — admin only */
export async function updatePage(
  id: string,
  formData: FormData,
): Promise<PageActionResult> {
  const raw = formDataToObject(formData);
  if (raw.publishedAt === "") raw.publishedAt = null;

  try {
    await api.patch(`/pages/${encodeURIComponent(id)}`, raw);
  } catch (error) {
    const errors = fieldErrors(error);
    if (errors) return { errors };
    console.error("Error updating page:", error);
    return { errors: { _form: ["Failed to update page."] } };
  }

  return { success: true };
}

/** DELETE /api/pages/:id — admin only. Throws on failure. */
export async function deletePage(id: string): Promise<void> {
  try {
    await api.delete(`/pages/${encodeURIComponent(id)}`);
  } catch (err: any) {
    console.error("Error deleting page:", err);
    const message =
      (typeof err?.response?.data?.error === "string" &&
        err.response.data.error) ||
      (typeof err?.response?.data?.message === "string" &&
        err.response.data.message) ||
      err?.message ||
      "Failed to delete page.";
    throw new Error(message);
  }
}
