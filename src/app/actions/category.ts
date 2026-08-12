"use server";

import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import CategoryProperty from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import "@/models/AttributeGroup";
import Attribute from "@/models/Attribute";
import "@/models/UnitFamily";

// ---------- Helper ----------
function generateSlug(name: string) {
  return slugify(name, { lower: true });
}

// ---------- Category Property CRUD ----------

/**
 * Get a single category property by ID, or all properties if no ID provided.
 */
export async function getCategoryProperty(id?: string) {
  await connection();
  if (id) {
    const property: any = await CategoryProperty.findById(id)
      .populate("sets")
      .lean();
    if (!property) return null;
    return {
      ...property,
      _id: property?._id?.toString(),
      createdAt: property?.createdAt.toISOString(),
      updatedAt: property?.updatedAt.toISOString(),
    };
  } else {
    const properties = await CategoryProperty.find().populate("sets").lean();
    return properties.map((prop) => ({
      ...prop,
      _id: prop?._id?.toString(),
      createdAt: prop?.createdAt.toISOString(),
      updatedAt: prop?.updatedAt.toISOString(),
    }));
  }
}

/**
 * Create a new category property.
 * @param data - { name, description?, sets: string[] (AttributeSet IDs) }
 */
export async function createCategoryProperty(data: {
  name: string;
  description?: string;
  sets: string[];
}) {
  try {
    await connection();
    const { name, description, sets } = data;

    // Validate that all sets exist
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

/**
 * Update an existing category property.
 * @param id - CategoryProperty ID
 * @param data - { name?, description?, sets?: string[] }
 */
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
    if (!property) {
      return { error: "Category property not found." };
    }

    if (data.name) property.name = data.name;
    if (data.description !== undefined) property.description = data.description;
    if (data.sets) {
      // Validate that all sets exist
      const existingSets = await AttributeSet.find({ _id: { $in: data.sets } });
      if (existingSets.length !== data.sets.length) {
        return { error: "One or more AttributeSet IDs are invalid." };
      }
      property.sets = data.sets.map((s) => new mongoose.Types.ObjectId(s));
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

/**
 * Delete a category property.
 */
export async function deleteCategoryProperty(id: string) {
  try {
    await connection();
    const property = await CategoryProperty.findByIdAndDelete(id);
    if (!property) {
      return { error: "Category property not found." };
    }
    // Optionally: remove reference from any Category that uses this property
    await Category.updateMany({ property: id }, { $unset: { property: "" } });
    revalidatePath("/category-properties");
    return { success: true, message: "Category property deleted." };
  } catch (error: any) {
    console.error("Error deleting category property:", error);
    return { error: error.message || "Failed to delete category property." };
  }
}

// ---------- Category CRUD (with property support) ----------

/**
 * Get category(ies). Supports fetching by ID, parentId, or name.
 * If no filters, returns all categories.
 */
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
      .populate("property") // populate the property field
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
      _id: sub?._id?.toString(),
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
      _id: cat?._id?.toString(),
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

/**
 * Create or update a category.
 * For update, provide `id`. For create, omit `id`.
 * @param formData - category data; `propertyId` is the ID of a CategoryProperty.
 */
export async function createCategory(
  formData: {
    _id?: string;
    name?: string;
    parent_id?: string;
    description?: string;
    imageUrl?: string[];
    propertyId?: string; // replaces attributeSetsIds
  },
  id?: string | null,
) {
  try {
    const { name, parent_id, description, imageUrl, propertyId } = formData;
    const url_slug = generateSlug(name + (description || ""));
    await connection();

    const existingCategory = id ? await Category.findById(id) : null;

    // Validate propertyId if provided
    if (propertyId) {
      const propertyExists = await CategoryProperty.findById(propertyId);
      if (!propertyExists) {
        return { error: "Invalid propertyId: CategoryProperty not found." };
      }
    }

    if (existingCategory) {
      // Update
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
      // Create
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

/**
 * Delete a category by ID.
 */
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

// category.ts

export async function getCategoryAttributeSets(categoryId: string) {
  await connection();

  // 1. Fetch category and its property (only sets)
  const category: any = await Category.findById(categoryId)
    .populate({
      path: "property",
      populate: {
        path: "sets",
      },
    })
    .lean();

  if (!category || !category.property) return [];

  const setIds = category.property.sets.map((s: any) => s._id);
  if (setIds.length === 0) return [];

  // 2. Fetch attribute sets with groups (but not attributes yet)
  const attributeSets = await AttributeSet.find({ _id: { $in: setIds } })
    .populate("groups") // groups are full documents
    .lean();

  // 3. Collect all attribute subdocuments from all groups
  const allSubdocs: { id: any; isRequired: boolean; groupId: string }[] = [];
  for (const set of attributeSets) {
    for (const group of set.groups || []) {
      for (const sub of group.attributes || []) {
        if (sub.id) {
          allSubdocs.push({
            id: sub.id,
            isRequired: sub.isRequired,
            groupId: group._id.toString(),
          });
        }
      }
    }
  }

  // Extract unique attribute IDs (skip invalid ones)
  const attrIds: string[] = [];
  const invalidIds: any[] = [];
  for (const sub of allSubdocs) {
    const idStr = sub.id?.toString();
    if (idStr && mongoose.Types.ObjectId.isValid(idStr)) {
      attrIds.push(idStr);
    } else {
      invalidIds.push(sub.id);
    }
  }
  if (invalidIds.length > 0) {
    console.warn("Skipping invalid attribute IDs:", invalidIds);
  }

  // 4. Fetch all valid attributes with unitFamily
  const attributes = await Attribute.find({ _id: { $in: attrIds } })
    .populate("unitFamily")
    .lean();

  // Map attribute _id -> attribute doc
  const attrMap: Record<string, any> = {};
  for (const attr of attributes) {
    const attrId = (attr as any)._id;
    if (!attrId) continue;
    attrMap[attrId.toString()] = attr;
  }

  // 5. Build tree helper
  const buildTree = (groups: any[], parentId: string | null = null): any[] => {
    return groups
      .filter((g) => {
        const gParent = g.parent_id?.toString();
        return parentId === null ? !gParent : gParent === parentId;
      })
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((g) => {
        // Map attributes from subdocuments
        const attrs = (g.attributes || [])
          .map((sub: any) => {
            const attrDoc = attrMap[sub.id?.toString()];
            if (!attrDoc) return null;
            return {
              _id: attrDoc._id.toString(),
              code: attrDoc.code,
              name: attrDoc.name,
              option: attrDoc.option || [],
              type: attrDoc.type,
              isRequired: sub.isRequired,
              unitFamily: attrDoc.unitFamily
                ? {
                    _id: attrDoc.unitFamily._id.toString(),
                    name: attrDoc.unitFamily.name,
                    baseUnit: attrDoc.unitFamily.baseUnit,
                  }
                : null,
            };
          })
          .filter(Boolean);

        return {
          ...g,
          _id: g._id.toString(),
          parent_id: g.parent_id?.toString() || null,
          attributes: attrs,
          children: buildTree(groups, g._id.toString()),
        };
      });
  };

  // 6. Return attribute sets with group trees
  return attributeSets.map((set: any) => ({
    _id: set._id.toString(),
    title: set.title,
    code: set.code,
    groups: buildTree(set.groups || []),
  }));
}
