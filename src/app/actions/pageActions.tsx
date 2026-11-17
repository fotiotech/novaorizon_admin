"use server";


import { requireAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";

// ----------------------------------------------
// 1. Zod validation schema (rich)
// ----------------------------------------------
const PageValidationSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  slug: z.string().min(1, "Slug is required").max(100).optional(),
  excerpt: z.string().max(300).optional().default(""),
  content: z.string().optional().default(""),
  featuredImage: z.string().url().optional().default(""),
  metaTitle: z.string().max(60).optional().default(""),
  metaDescription: z.string().max(160).optional().default(""),
  metaKeywords: z.array(z.string()).optional().default([]),
  status: z.enum(["draft", "review", "published", "archived"]).default("draft"),
  publishedAt: z.string().datetime().optional().nullable(),
  author: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  category: z.string().optional().default(""),
  isFeatured: z.boolean().default(false),
});

// Type inferred from Zod
export type PageFormData = z.infer<typeof PageValidationSchema>;

// ----------------------------------------------
// 2. Helper: convert FormData to object (with arrays)
// ----------------------------------------------
function formDataToObject(formData: FormData): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const [key, value] of formData.entries()) {
    // Handle multiple values (tags, keywords)
    if (key === "tags" || key === "metaKeywords") {
      if (!obj[key]) obj[key] = [];
      obj[key].push(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

// ----------------------------------------------
// 3. Create Page
// ----------------------------------------------
export async function createPage(formData: FormData) {
  await requireAdmin();

  const raw = formDataToObject(formData);
  // Coerce publishedAt to Date or null
  if (raw.publishedAt === "") raw.publishedAt = null;

  const result = PageValidationSchema.safeParse(raw);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const data = result.data;

  try {
    await apiFetch("/pages", { method: "POST", body: data });
  } catch (error) {
    if (error instanceof ApiError && error.fieldErrors) {
      return { errors: error.fieldErrors };
    }
    console.error("Error creating page:", error);
    return { errors: { _form: ["Failed to create page."] } };
  }

  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

// ----------------------------------------------
// 4. Update Page
// ----------------------------------------------
export async function updatePage(id: string, formData: FormData) {
  await requireAdmin();

  const raw = formDataToObject(formData);
  if (raw.publishedAt === "") raw.publishedAt = null;

  const result = PageValidationSchema.safeParse(raw);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const data = result.data;

  try {
    await apiFetch(`/pages/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: data,
    });
  } catch (error) {
    if (error instanceof ApiError && error.fieldErrors) {
      return { errors: error.fieldErrors };
    }
    console.error("Error updating page:", error);
    return { errors: { _form: ["Failed to update page."] } };
  }

  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${id}`);
  redirect("/admin/pages");
}

// ----------------------------------------------
// 5. Delete Page
// ----------------------------------------------
export async function deletePage(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await apiFetch(`/pages/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error deleting page:", error);
    return { error: "Failed to delete page." };
  }
  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

// ----------------------------------------------
// 6. Fetch helpers (server components)
// ----------------------------------------------
export async function getPages(): Promise<any[]> {
  await requireAdmin();
  const pages = await apiData<any[]>("/pages");
  return pages ?? [];
}

export async function getPageById(id: string): Promise<any | null> {
  await requireAdmin();
  try {
    const page = await apiData<any>(`/pages/${encodeURIComponent(id)}`);
    return page ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getPageBySlug(slug: string): Promise<any | null> {
  await requireAdmin();
  try {
    const page = await apiData<any>(
      `/pages/by-slug/${encodeURIComponent(slug)}`,
    );
    return page ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
