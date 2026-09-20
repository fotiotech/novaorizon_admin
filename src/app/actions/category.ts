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
  applyInheritedPropertyToCategory,
  buildAttributeSetsFromMappings,
  type AttributeSetResult,
} from "./category_property";

// ========================================================================
//  toPlain
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

    if (typeof Buffer !== "undefined" && Buffer.isBuffer(anyVal)) {
      return anyVal.toString("hex") as any;
    }

    if (
      anyVal._bsontype &&
      typeof anyVal.toString === "function" &&
      anyVal.constructor?.name !== "Object"
    ) {
      try {
        return anyVal.toString() as any;
      } catch {
        /* fall through */
      }
    }

    if (typeof anyVal.toObject === "function") {
      return toPlain(anyVal.toObject()) as any;
    }

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(anyVal)) {
      out[k] = toPlain(v);
    }
    return out as any;
  }

  return value;
}

// ========================================================================
//  projectForList
//
//  Strips raw ObjectIds and replaces the inherited ref with a cheap
//  boolean. Keeps the `property` populated object (form uses it).
// ========================================================================
function projectForList(category: any) {
  if (!category) return category;
  const { inheritedProperty, property, ...rest } = category;

  return {
    ...rest,
    property: property ?? null,
    hasInheritedSnapshot: !!inheritedProperty,
  };
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
  if (!normalizedName) return "category";

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

export async function getCategories() {
  await connection();
  const categories = await Category.find().populate("property").lean();
  return toPlain(categories).map(projectForList);
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
    return projectForList(toPlain(category));
  } else if (parentId) {
    const subCategories = await Category.find({ parentId })
      .populate("property")
      .lean();
    return toPlain(subCategories);
  } else {
    const categories = await Category.find().populate("property").lean();
    return toPlain(categories).map(projectForList);
  }
}

// ========================================================================
//  createCategory
//
//  - `property` = admin's manual selection. Always written.
//  - `inheritedProperty` = cleared when inheritance is off. Left as-is
//    when on so the last snapshot survives edits; the next Re-run
//    regenerates it (and cleans up any stale doc from a rename).
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

    const canInherit = !!resolvedParentId;
    const wantsInherit = inheritProperty === true && canInherit;

    const existingCategory = id ? await Category.findById(id) : null;

    if (existingCategory) {
      const updateData: any = {
        name,
        parentId: resolvedParentId,
        slug: slugValue,
        url_slug: slugValue,
        description,
        imageUrl: imageUrl || [],
        inheritProperty: wantsInherit,
        property: propertyId || null,
      };

      // Turning inheritance off: delete the snapshot doc and clear ref.
      if (!wantsInherit && existingCategory.inheritedProperty) {
        await CategoryProperty.deleteOne({
          _id: existingCategory.inheritedProperty,
        });
        updateData.inheritedProperty = null;
      }

      await Category.findOneAndUpdate(
        { _id: existingCategory._id },
        { $set: updateData },
      );
    } else {
      const newCategory = new Category({
        slug: slugValue,
        url_slug: slugValue,
        name,
        parentId: resolvedParentId,
        description,
        imageUrl: imageUrl || [],
        inheritProperty: wantsInherit,
        property: propertyId || null,
        inheritedProperty: null,
      });
      await newCategory.save();
    }

    revalidatePath("/categories");
    revalidatePath("/catalog/categories/property");

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
//  runCategoryInheritance
// ========================================================================
export async function runCategoryInheritance(
  categoryId: string,
): Promise<{ success?: boolean; error?: string; warning?: string }> {
  try {
    await connection();

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return { error: "Invalid category ID." };
    }

    const category: any = await Category.findById(categoryId)
      .select("parentId inheritProperty")
      .lean();
    if (!category) return { error: "Category not found." };

    if (!category.parentId) {
      return { error: "Root categories cannot inherit properties." };
    }

    if (category.inheritProperty !== true) {
      await Category.findByIdAndUpdate(categoryId, {
        $set: { inheritProperty: true },
      });
    }

    const { warning } = await applyInheritedPropertyToCategory(categoryId);

    revalidatePath("/categories");
    revalidatePath("/catalog/categories/property");

    return warning ? { success: true, warning } : { success: true };
  } catch (error: any) {
    console.error("Error running category inheritance:", error);
    return { error: error.message || "Failed to run inheritance." };
  }
}

// ========================================================================
//  deleteCategory
// ========================================================================
export async function deleteCategory(id: string) {
  try {
    await connection();

    const category: any = await Category.findById(id)
      .select("inheritedProperty")
      .lean();

    // Delete the auto-gen snapshot doc so nothing dangles.
    if (category?.inheritedProperty) {
      await CategoryProperty.deleteOne({ _id: category.inheritedProperty });
    }

    await Category.updateMany({ parentId: id }, { $set: { parentId: null } });
    await Category.updateMany({ property: id }, { $unset: { property: "" } });
    await Category.updateMany(
      { inheritedProperty: id },
      { $unset: { inheritedProperty: "" } },
    );

    await mongoose.models.Product?.updateMany(
      { categoryId: id },
      { $unset: { categoryId: "" } },
    );

    await Category.findByIdAndDelete(id);
    revalidatePath("/categories");
    revalidatePath("/catalog/categories/property");
    return { success: true, message: "Category deleted successfully" };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { error: "Could not delete the category." };
  }
}

// ========================================================================
//  getCategoryAttributeSets
//
//  - inheritProperty on + inheritedProperty set → snapshot doc
//  - otherwise                                 → own property doc
// ========================================================================
export async function getCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSetResult[]> {
  await connection();

  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    return [];
  }

  const category: any = await Category.findById(categoryId)
    .select("property inheritedProperty inheritProperty parentId")
    .lean();

  if (!category) return [];

  const isRoot = !category.parentId;
  const wantsInheritance = category.inheritProperty === true && !isRoot;

  const effectiveId =
    wantsInheritance && category.inheritedProperty
      ? category.inheritedProperty
      : category.property;

  if (!effectiveId) return [];

  const property: any = await CategoryProperty.findById(effectiveId).lean();
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
