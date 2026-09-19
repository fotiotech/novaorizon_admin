// app/actions/category.ts

"use server";

import mongoose from "mongoose";
import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import CategoryProperty from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import Attribute from "@/models/Attribute";
import AttributeGroup from "@/models/AttributeGroup";
import "@/models/UnitFamily";
import { revalidatePath } from "next/cache";
import { deleteS3Object } from "./s3";
import {
  collectAncestorProperties,
  ensureCategoryPropertyFromMappings,
  buildAttributeSetsFromMappings,
  type AttributeSetResult,
} from "./category_property";

// ========================================================================
//  toPlain – deep-convert Mongoose / BSON values into client-safe JSON.
// ========================================================================
function toPlain<T>(value: T): T {
  if (value === null || value === undefined) return value;

  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;
  if (t === "bigint") return String(value) as any;
  if (t === "function") return undefined as any;

  if (value instanceof Date) return value.toISOString() as any;

  if (Array.isArray(value)) return value.map((v) => toPlain(v)) as any;

  if (typeof value === "object") {
    const anyVal = value as any;

    // BSON ObjectId
    if (
      anyVal._bsontype === "ObjectId" ||
      anyVal.constructor?.name === "ObjectId" ||
      typeof anyVal.toHexString === "function"
    ) {
      try {
        return anyVal.toString() as any;
      } catch {
        return null as any;
      }
    }

    // Node Buffer
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(anyVal)) {
      return anyVal.toString("hex") as any;
    }

    // Decimal128 / Long / other BSON wrappers with a JS value
    if (
      anyVal._bsontype &&
      typeof anyVal.toString === "function" &&
      anyVal.constructor?.name !== "Object"
    ) {
      try {
        return anyVal.toString() as any;
      } catch {
        // fall through
      }
    }

    // Mongoose document → plain object, then recurse
    if (typeof anyVal.toObject === "function") {
      return toPlain(anyVal.toObject()) as any;
    }

    // Plain object → recurse
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(anyVal)) {
      out[k] = toPlain(v);
    }
    return out as any;
  }

  return value;
}

// ---------- Helper: Slug ----------
function generateSlug(name: string) {
  return slugify(name, { lower: true });
}

async function getUniqueCategorySlug(
  name: string,
  parentId?: string | null,
  excludeId?: string | null,
): Promise<string> {
  const normalizedName = (name || "").trim();
  if (!normalizedName) {
    return "category";
  }

  let base = generateSlug(normalizedName);
  if (parentId) {
    const parent = await Category.findById(parentId).select("slug name");
    if (parent) {
      const parentSlug =
        parent.slug || parent.url_slug || generateSlug(parent.name || "");
      base = `${parentSlug}>${generateSlug(normalizedName)}`;
    }
  }

  let candidate = base;
  let suffix = 2;

  while (
    await Category.exists({
      slug: candidate,
      _id: { $ne: excludeId || undefined },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function generatePropertyCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export async function getCategories() {
  await connection();
  const categories = await Category.find().populate("property").lean();
  return toPlain(categories);
}

// ---------- Category CRUD ----------
export async function getCategory(
  id?: string | null,
  parentId?: string | null,
  name?: string | null,
): Promise<any> {
  await connection();
  if (name) {
    const category = await Category.findOne({ name });
    if (category) {
      const subCategories = await Category.find({ parentId: category._id });
      return toPlain(subCategories);
    }
    return [];
  } else if (id) {
    const category = await Category.findById(id).populate("property").lean();
    if (!category) return null;
    return toPlain(category);
  } else if (parentId) {
    const subCategories = await Category.find({ parentId })
      .populate("property")
      .lean();
    return toPlain(subCategories);
  } else {
    const categories = await Category.find().populate("property").lean();
    return toPlain(categories);
  }
}

// ========================================================================
//  createCategory
// ========================================================================
export async function createCategory(
  formData: {
    _id?: string;
    name?: string;
    parentId?: string;
    description?: string;
    imageUrl?: string[];
    propertyId?: string;
    inheritProperty?: boolean;
  },
  id?: string | null,
) {
  try {
    const {
      name,
      parentId,
      description,
      imageUrl,
      propertyId,
      inheritProperty,
    } = formData;
    await connection();

    const resolvedParentId = parentId || null;
    if (!name || !name.trim()) {
      return { error: "Category name is required." };
    }

    if (id && resolvedParentId && id === resolvedParentId) {
      return { error: "A category cannot be its own parent." };
    }

    if (resolvedParentId && id) {
      let currentParentId: string | null = resolvedParentId;
      const seen = new Set<string>();
      while (currentParentId && !seen.has(currentParentId)) {
        seen.add(currentParentId);
        const parentCategory: any =
          await Category.findById(currentParentId).select("parentId");
        if (!parentCategory) break;
        if (parentCategory.parentId?.toString() === id) {
          return {
            error: "A category cannot be assigned to one of its descendants.",
          };
        }
        currentParentId = parentCategory.parentId?.toString() || null;
      }
    }

    const slugValue = await getUniqueCategorySlug(
      name,
      resolvedParentId,
      id || undefined,
    );

    // ---- Inheritance is only valid when the category has a parent ------
    // The root ("All Category") has nothing above it. If a client sends
    // `inheritProperty: true` for it anyway, we coerce it to false so the
    // DB can never hold a self-inheriting root.
    const canInherit = !!resolvedParentId;
    const wantsInherit = inheritProperty === true && canInherit;

    let categoryId: string | null = null;
    const existingCategory = id ? await Category.findById(id) : null;

    if (existingCategory) {
      const updateData: any = {
        name,
        parentId: resolvedParentId,
        slug: slugValue,
        url_slug: slugValue,
        description,
        imageUrl: imageUrl || [],
      };

      if (wantsInherit) {
        updateData.inheritProperty = true;
      } else {
        updateData.inheritProperty = false;
        updateData.property = propertyId || null;
      }

      await Category.findOneAndUpdate(
        { _id: existingCategory._id },
        { $set: updateData },
      );
      categoryId = existingCategory._id.toString();
    } else {
      const newCategoryData: any = {
        slug: slugValue,
        url_slug: slugValue,
        name,
        parentId: resolvedParentId,
        description,
        imageUrl: imageUrl || [],
        inheritProperty: wantsInherit,
      };

      newCategoryData.property = wantsInherit ? null : propertyId || null;

      const newCategory = new Category(newCategoryData);
      const saved = await newCategory.save();
      categoryId = saved._id.toString();
    }

    if (wantsInherit && categoryId) {
      const { mappings } = await collectAncestorProperties(categoryId);

      if (mappings.length === 0) {
        await Category.findByIdAndUpdate(categoryId, {
          $set: { property: null },
        });
        return {
          success: true,
          warning: "No ancestor properties found to inherit.",
        };
      }

      const baseCode = generatePropertyCode(name || "");
      const propertyName = `${name || "Category"}`;
      const propertyDescription = `Auto-generated from ancestors`;

      // Preserve both attribute flags (isRequired, isHighlight) when
      // persisting the merged inherited property.
      const preparedMappings = mappings.map((m: any) => ({
        set: new mongoose.Types.ObjectId(m.set),
        groups: m.groups.map((g: any) => ({
          group: new mongoose.Types.ObjectId(g.group),
          attributes: g.attributes.map((a: any) => ({
            attribute: new mongoose.Types.ObjectId(a.attribute),
            isRequired: a.isRequired === true,
            isHighlight: a.isHighlight === true,
          })),
        })),
      }));

      let property = await CategoryProperty.findOne({ code: baseCode });

      if (property) {
        property.name = propertyName;
        property.description = propertyDescription;
        property.mappings = preparedMappings as any;
        await property.save();
      } else {
        property = new CategoryProperty({
          code: baseCode,
          name: propertyName,
          description: propertyDescription,
          mappings: preparedMappings as any,
        });
        await property.save();
      }

      await Category.findByIdAndUpdate(categoryId, {
        $set: { property: property._id },
      });

      revalidatePath("/categories");
      revalidatePath("/category-properties");
    }

    revalidatePath("/categories");
    return { success: true };
  } catch (error: any) {
    console.error(
      "Error processing category request:",
      error?.message,
      error?.stack,
    );
    return {
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

// ========================================================================
//  deleteCategory
// ========================================================================
export async function deleteCategory(id: string) {
  try {
    await connection();

    await Category.updateMany({ parentId: id }, { $set: { parentId: null } });
    await Category.updateMany({ property: id }, { $unset: { property: "" } });

    await mongoose.models.Product?.updateMany(
      { categoryId: id },
      { $unset: { categoryId: "" } },
    );

    await Category.findByIdAndDelete(id);
    revalidatePath("/categories");
    return { success: true, message: "Category deleted successfully" };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { error: "Could not delete the category." };
  }
}

// ========================================================================
//  getCategoryAttributeSets
// ========================================================================
export async function getCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSetResult[]> {
  await connection();

  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    return [];
  }

  const category: any = await Category.findById(categoryId)
    .select("inheritProperty property parentId")
    .lean();

  if (!category) return [];

  const isRoot = !category.parentId;
  const wantsInheritance = category.inheritProperty === true && !isRoot;

  // ---- Inherited view: merge self + ancestors, do NOT persist ---------
  if (wantsInheritance) {
    const { mappings } = await collectAncestorProperties(categoryId);
    if (mappings.length === 0) return [];
    return buildAttributeSetsFromMappings(mappings);
  }

  // ---- Own property only ----------------------------------------------
  if (!category.property) return [];

  const property: any = await CategoryProperty.findById(
    category.property,
  ).lean();
  if (!property) return [];

  return buildAttributeSetsFromMappings(property.mappings);
}

export async function getAllAttributeSets() {
  await connection();
  const sets = await AttributeSet.find().select("_id title code").lean();
  return toPlain(sets);
}

export async function getAllAttributeGroups() {
  await connection();
  const groups = await AttributeGroup.find().select("_id name code").lean();
  return toPlain(groups);
}

export async function getAllAttributes() {
  await connection();
  const attrs = await Attribute.find().select("_id name code type").lean();
  return toPlain(attrs);
}

export async function deleteCategoryImage(
  categoryId: string,
  imageUrl: string,
) {
  try {
    await connection();

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return { success: false, error: "Invalid category ID" };
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return { success: false, error: "Category not found" };
    }

    if (!category.imageUrl?.includes(imageUrl)) {
      return { success: false, error: "Image not found in category" };
    }

    await deleteS3Object(imageUrl);

    category.imageUrl = category.imageUrl.filter(
      (url: string) => url !== imageUrl,
    );
    await category.save();

    revalidatePath("/categories");

    return { success: true, data: toPlain(category.imageUrl) };
  } catch (error) {
    console.error("Error deleting category image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}
