"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import PageModel, { IPage } from "@/models/Page";
import { connection } from "@/utils/connection";

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
export async function createPage(
  formData: FormData,
): Promise<{ errors?: Record<string, string[]>; success?: boolean }> {
  await connection();

  const raw = formDataToObject(formData);
  // Coerce publishedAt to Date or null
  if (raw.publishedAt === "") raw.publishedAt = null;

  const result = PageValidationSchema.safeParse(raw);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const data = result.data;

  try {
    // Check if slug already exists
    if (data.slug) {
      const existing = await PageModel.findOne({ slug: data.slug });
      if (existing) {
        return { errors: { slug: ["Slug already exists"] } };
      }
    }

    // Convert publishedAt string to Date if present
    const pageData = { ...data };
    if (pageData.publishedAt) {
      pageData.publishedAt = new Date(pageData.publishedAt) as any;
    } else {
      pageData.publishedAt = undefined;
    }

    const page = new PageModel(pageData);
    await page.save();
  } catch (error) {
    console.error("Error creating page:", error);
    return { errors: { _form: ["Failed to create page."] } };
  }

  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

// ----------------------------------------------
// 4. Update Page
// ----------------------------------------------
export async function updatePage(
  id: string,
  formData: FormData,
): Promise<{ errors?: Record<string, string[]>; success?: boolean }> {
  await connection();

  const raw = formDataToObject(formData);
  if (raw.publishedAt === "") raw.publishedAt = null;

  const result = PageValidationSchema.safeParse(raw);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const data = result.data;

  try {
    // Check slug uniqueness (excluding itself)
    if (data.slug) {
      const existing = await PageModel.findOne({
        slug: data.slug,
        _id: { $ne: id },
      });
      if (existing) {
        return { errors: { slug: ["Slug already exists"] } };
      }
    }

    // Prepare update data
    const updateData = { ...data };
    if (updateData.publishedAt) {
      updateData.publishedAt = new Date(updateData.publishedAt) as any;
    } else {
      updateData.publishedAt = null;
    }

    await PageModel.findByIdAndUpdate(id, updateData, { runValidators: true });
  } catch (error) {
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
  await connection();
  try {
    await PageModel.findByIdAndDelete(id);
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
export async function getPages(): Promise<Omit<IPage, keyof Document>[]> {
  await connection();
  const pages = await PageModel.find({}).sort({ createdAt: -1 }).lean();
  return pages.map((p) => ({
    ...p,
    _id: p._id.toString(),
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  })) as any;
}

export async function getPageById(id: string): Promise<any | null> {
  await connection();
  const page = await PageModel.findById(id).lean();
  if (!page) return null;
  return {
    ...page,
    _id: page._id.toString(),
    publishedAt: page.publishedAt ? page.publishedAt.toISOString() : null,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

export async function getPageBySlug(slug: string): Promise<any | null> {
  await connection();
  const page = await PageModel.findOne({ slug, status: "published" }).lean();
  if (!page) return null;
  return {
    ...page,
    _id: page._id.toString(),
    publishedAt: page.publishedAt ? page.publishedAt.toISOString() : null,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}
