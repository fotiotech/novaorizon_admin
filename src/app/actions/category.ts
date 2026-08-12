"use server";

import mongoose, { Types } from "mongoose"; // ✅ single import
import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import CategoryProperty from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import Attribute from "@/models/Attribute";
import "@/models/AttributeGroup";
import "@/models/UnitFamily";
import { revalidatePath } from "next/cache";

// ---------- Helper ----------
function generateSlug(name: string) {
  return slugify(name, { lower: true });
}

// ---------- Category Property CRUD (unchanged) ----------
export async function getCategoryProperty(id?: string) {
  await connection();
  if (id) {
    const property: any = await CategoryProperty.findById(id)
      .populate("sets")
      .lean();
    if (!property) return null;
    return {
      ...property,
      _id: property._id?.toString(),
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  } else {
    const properties = await CategoryProperty.find().populate("sets").lean();
    return properties.map((prop) => ({
      ...prop,
      _id: prop._id?.toString(),
      createdAt: prop.createdAt.toISOString(),
      updatedAt: prop.updatedAt.toISOString(),
    }));
  }
}

export async function createCategoryProperty(data: {
  name: string;
  description?: string;
  sets: string[];
}) {
  try {
    await connection();
    const { name, description, sets } = data;
    if (sets && sets.length) {
      const existingSets = await AttributeSet.find({ _id: { $in: sets } });
      if (existingSets.length !== sets.length) {
        return { error: "One or more AttributeSet IDs are invalid." };
      }
    }
    const newProperty = new CategoryProperty({
      name,
      description,
      sets: sets || [],
    });
    await newProperty.save();
    revalidatePath("/category-properties");
    return {
      success: true,
      property: {
        ...newProperty.toObject(),
        _id: newProperty._id.toString(),
        createdAt: newProperty.createdAt.toISOString(),
        updatedAt: newProperty.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("Error creating category property:", error);
    return { error: error.message || "Failed to create category property." };
  }
}

export async function updateCategoryProperty(
  id: string,
  data: {
    name?: string;
    description?: string;
    sets?: string[];
  },
) {
  try {
    await connection();
    const property = await CategoryProperty.findById(id);
    if (!property) return { error: "Category property not found." };
    if (data.name) property.name = data.name;
    if (data.description !== undefined) property.description = data.description;
    if (data.sets) {
      const existingSets = await AttributeSet.find({ _id: { $in: data.sets } });
      if (existingSets.length !== data.sets.length) {
        return { error: "One or more AttributeSet IDs are invalid." };
      }
      property.sets = data.sets.map((s) => new Types.ObjectId(s));
    }
    await property.save();
    revalidatePath("/category-properties");
    return {
      success: true,
      property: {
        ...property.toObject(),
        _id: property._id.toString(),
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("Error updating category property:", error);
    return { error: error.message || "Failed to update category property." };
  }
}

export async function deleteCategoryProperty(id: string) {
  try {
    await connection();
    const property = await CategoryProperty.findByIdAndDelete(id);
    if (!property) return { error: "Category property not found." };
    await Category.updateMany({ property: id }, { $unset: { property: "" } });
    revalidatePath("/category-properties");
    return { success: true, message: "Category property deleted." };
  } catch (error: any) {
    console.error("Error deleting category property:", error);
    return { error: error.message || "Failed to delete category property." };
  }
}

// ---------- Category CRUD (unchanged) ----------
export async function getCategory(
  id?: string | null,
  parentId?: string | null,
  name?: string | null,
) {
  await connection();
  if (name) {
    const category = await Category.findOne({ name });
    if (category) {
      const subCategories = await Category.find({ parent_id: category._id });
      return subCategories.map((sub) => ({
        ...sub.toObject(),
        _id: sub._id.toString(),
        parent_id: sub.parent_id?.toString(),
        created_at: sub.created_at.toISOString(),
        updated_at: sub.updated_at.toISOString(),
      }));
    }
    return [];
  } else if (id) {
    const category: any = await Category.findById(id)
      .populate("property")
      .lean();
    if (!category) return null;
    return {
      ...category,
      _id: category._id.toString(),
      parent_id: category.parent_id?.toString(),
      created_at: category.created_at.toISOString(),
      updated_at: category.updated_at.toISOString(),
      property: category.property
        ? {
            ...category.property,
            _id: category.property._id.toString(),
          }
        : null,
    };
  } else if (parentId) {
    const subCategories = await Category.find({ parent_id: parentId })
      .populate("property")
      .lean();
    return subCategories.map((sub) => ({
      ...sub,
      _id: sub._id?.toString(),
      parent_id: sub.parent_id?.toString(),
      created_at: sub.created_at.toISOString(),
      updated_at: sub.updated_at.toISOString(),
      property: sub.property
        ? {
            ...sub.property,
            _id: sub.property._id.toString(),
          }
        : null,
    }));
  } else {
    const categories = await Category.find().populate("property").lean();
    return categories.map((cat) => ({
      ...cat,
      _id: cat._id?.toString(),
      parent_id: cat.parent_id?.toString(),
      created_at: cat.created_at.toISOString(),
      updated_at: cat.updated_at.toISOString(),
      property: cat.property
        ? {
            ...cat.property,
            _id: cat.property._id.toString(),
          }
        : null,
    }));
  }
}

export async function createCategory(
  formData: {
    _id?: string;
    name?: string;
    parent_id?: string;
    description?: string;
    imageUrl?: string[];
    propertyId?: string;
  },
  id?: string | null,
) {
  try {
    const { name, parent_id, description, imageUrl, propertyId } = formData;
    const url_slug = generateSlug(name + (description || ""));
    await connection();
    const existingCategory = id ? await Category.findById(id) : null;
    if (propertyId) {
      const propertyExists = await CategoryProperty.findById(propertyId);
      if (!propertyExists) {
        return { error: "Invalid propertyId: CategoryProperty not found." };
      }
    }
    if (existingCategory) {
      const updateData: any = {
        url_slug,
        name,
        parent_id: parent_id || null,
        description,
        imageUrl: imageUrl || [],
      };
      if (propertyId !== undefined) {
        updateData.property = propertyId || null;
      }
      await Category.findOneAndUpdate(
        { _id: existingCategory._id },
        { $set: updateData },
      );
    } else {
      const newCategory = new Category({
        url_slug,
        name,
        parent_id: parent_id || null,
        description,
        imageUrl: imageUrl || [],
        property: propertyId || null,
      });
      await newCategory.save();
    }
    revalidatePath("/categories");
    return { success: true };
  } catch (error: any) {
    console.error(
      "Error processing category request:",
      error.message,
      error.stack,
    );
    return { error: "Something went wrong." };
  }
}

export async function deleteCategory(id: string) {
  try {
    await connection();
    await Category.findByIdAndDelete(id);
    revalidatePath("/categories");
    return { success: true, message: "Category deleted successfully" };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { error: "Could not delete the category." };
  }
}

// Types for reusable attribute structure
export interface AttributeUnitFamily {
  id: string;
  name: string;
  baseUnit: string;
}

export interface Attribute {
  id: string;
  code: string;
  name: string;
  type: string;
  options: string[];
  isRequired: boolean;
  unitFamily: AttributeUnitFamily | null;
  sortOrder: number;
}

export interface Group {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  attributes: Attribute[];
  children: Group[];
}

export interface AttributeSet {
  id: string;
  title: string;
  code: string;
  groups: Group[];
}

// ---------- Standardized Attribute Set Fetcher ----------

export async function getCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSet[]> {
  await connection();

  // 1. Fetch category -> property -> sets
  const category: any = await Category.findById(categoryId)
    .populate<{ property: { sets: { _id: Types.ObjectId }[] } }>({
      path: "property",
      populate: { path: "sets" },
    })
    .lean();

  if (!category?.property) return [];

  const setIds = category.property.sets.map((s: any) => s._id);
  if (setIds.length === 0) return [];

  // 2. Fetch attribute sets with groups
  const attributeSets = await AttributeSet.find({ _id: { $in: setIds } })
    .populate<{ groups: any[] }>("groups")
    .lean();

  // 3. Collect all attribute subdocuments (normalize both formats)
  interface Subdoc {
    id: string;
    isRequired: boolean;
    groupId: string;
  }
  const allSubdocs: Subdoc[] = [];
  for (const set of attributeSets) {
    for (const group of set.groups || []) {
      const attrs = group.attributes;
      if (Array.isArray(attrs) && attrs.length > 0) {
        if (typeof attrs[0] === "string") {
          // Plain array of ObjectId strings
          for (const id of attrs as string[]) {
            allSubdocs.push({
              id,
              isRequired: false,
              groupId: group._id.toString(),
            });
          }
        } else {
          // Already subdocuments: { id: ObjectId, isRequired: boolean }
          for (const sub of attrs as {
            id: Types.ObjectId;
            isRequired: boolean;
          }[]) {
            if (sub.id) {
              allSubdocs.push({
                id: sub.id.toString(),
                isRequired: sub.isRequired,
                groupId: group._id.toString(),
              });
            }
          }
        }
      }
    }
  }

  // 4. Extract valid attribute IDs
  const attrIds = allSubdocs
    .map((sub) => sub.id)
    .filter((id) => Types.ObjectId.isValid(id)) as string[];

  // 5. Fetch attributes with unitFamily
  const attributes = await Attribute.find({ _id: { $in: attrIds } })
    .populate<{ unitFamily: any }>("unitFamily")
    .lean();

  const attrMap: Record<string, any> = {};
  for (const attr of attributes) {
    attrMap[attr._id.toString()] = attr;
  }

  // 6. Build group tree (standardized)
  const buildTree = (
    groups: any[],
    parentId: string | null = null,
  ): Group[] => {
    const groupIds = new Set(groups.map((g) => g._id.toString()));

    return groups
      .filter((g) => {
        const gParent = g.parent_id?.toString();
        if (parentId === null) {
          return !gParent || !groupIds.has(gParent);
        }
        return gParent === parentId;
      })
      .sort(
        (a, b) =>
          (a.sort_order ?? a.group_order ?? 0) -
          (b.sort_order ?? b.group_order ?? 0),
      )
      .map((g) => {
        const groupSubdocs = allSubdocs.filter(
          (sub) => sub.groupId === g._id.toString(),
        );

        const attrs: Attribute[] = groupSubdocs
          .map((sub) => {
            const attrDoc = attrMap[sub.id];
            if (!attrDoc) return null;
            return {
              id: attrDoc._id.toString(),
              code: attrDoc.code,
              name: attrDoc.name,
              type: attrDoc.type,
              options: attrDoc.option || [],
              isRequired: sub.isRequired,
              unitFamily: attrDoc.unitFamily
                ? {
                    id: attrDoc.unitFamily._id.toString(),
                    name: attrDoc.unitFamily.name,
                    baseUnit: attrDoc.unitFamily.baseUnit,
                  }
                : null,
              sortOrder: attrDoc.sort_order ?? 0,
            };
          })
          .filter((item): item is Attribute => item !== null);

        return {
          id: g._id.toString(),
          code: g.code,
          name: g.name,
          parentId: g.parent_id?.toString() || null,
          sortOrder: g.sort_order ?? g.group_order ?? 0,
          attributes: attrs,
          children: buildTree(groups, g._id.toString()),
        };
      });
  };

  // 7. Transform to standard AttributeSet[]
  return attributeSets.map((set) => ({
    id: set._id.toString(),
    title: set.title,
    code: set.code,
    groups: buildTree(set.groups || []),
  }));
}
