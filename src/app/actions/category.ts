"use server";

import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import AttributeSet from "@/models/AttributeSet";
import mongoose, { Types } from "mongoose";
import CategoryAttribute from "@/models/CategoryAttribute";
import { revalidatePath } from "next/cache";
import AttributeGroup from "@/models/AttributeGroup";
import "@/models/Attribute";
import "@/models/UnitFamily";

function generateSlug(name: string) {
  return slugify(name, { lower: true });
}

export async function getCategory(
  id?: string | null,
  parentId?: string | null,
  name?: string | null,
) {
  await connection();
  if (name) {
    // Find the category by name
    const category = await Category.findOne({ name });
    if (category) {
      const subCategories = await Category.find({ parent_id: category._id });

      const res = subCategories?.map((subCategory) => ({
        ...subCategory?.toObject(),
        _id: subCategory._id.toString(),
        parent_id: subCategory?.parent_id?.toString(),
        created_at: subCategory.created_at.toISOString(),
        updated_at: subCategory.updated_at.toISOString(),
      }));

      return res;
    }
  } else if (id) {
    const category = await Category.findById(id);
    if (category) {
      return {
        ...category?.toObject(),
        _id: category._id.toString(),
        parent_id: category?.parent_id?.toString(),
        created_at: category.created_at.toISOString(),
        updated_at: category.updated_at.toISOString(),
      };
    }
  } else if (parentId) {
    const subCategories = await Category.find({ parent_id: parentId });
    if (subCategories.length > 0) {
      return subCategories.map((subCategory) => ({
        ...subCategory?.toObject(),
        _id: subCategory._id?.toString(),
        parent_id: subCategory?.parent_id?.toString(),
        created_at: subCategory.created_at?.toISOString(),
        updated_at: subCategory.updated_at?.toISOString(),
      }));
    }
  } else {
    const categories = await Category.find();
    return categories.map((category) => ({
      ...category?.toObject(),
      _id: category._id.toString(),
      parent_id: category?.parent_id?.toString(),
      created_at: category.created_at.toISOString(),
      updated_at: category.updated_at.toISOString(),
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
    attributeSetsIds?: string[];
  },
  id?: string | null,
) {
  try {
    const { name, parent_id, description, imageUrl, attributeSetsIds } =
      formData;

    const url_slug = generateSlug(name + (description || ""));
    await connection();

    const existingCategory = id ? await Category.findById(id) : null;

    if (existingCategory) {
      // For update - use $set for simple fields but handle attributes properly
      const updateData: any = {
        url_slug,
        name,
        parent_id: parent_id || null, // Use null instead of undefined for empty parent
        description,
        imageUrl: imageUrl || [],
      };

      // Only update attribute sets if new ones are provided
      if (attributeSetsIds && attributeSetsIds.length > 0) {
        updateData.attribute_sets_ids = attributeSetsIds.map(String);
      }

      await Category.findOneAndUpdate(
        { _id: existingCategory._id },
        { $set: updateData },
      );
    } else {
      // For create - set all fields including empty arrays
      const newCategory = new Category({
        url_slug,
        name,
        parent_id: parent_id || null,
        description,
        imageUrl: imageUrl || [],
        attribute_sets_ids: attributeSetsIds?.map(String) || [],
      });
      await newCategory.save();
    }

    revalidatePath("/categories");
    return { success: true };
  } catch (error: any) {
    console.error(
      "Error while processing the request:\n",
      error.message,
      error.stack,
    );
    return { error: "Something went wrong." };
  }
}

export async function updateCategoryAttributes(
  categoryId: string,
  newAttributes: string[] = [],
): Promise<{ success?: boolean; attributes?: string[]; error?: string }> {
  try {
    if (!categoryId) return { error: "Category ID is required." };
    await connection();

    const existingCategory = await Category.findById(categoryId);
    if (!existingCategory) return { error: "Category not found." };

    // Replace the attributes instead of merging
    const updatedAttributes = newAttributes.map((id: string) => id.toString());

    console.log({ existingCategory, updatedAttributes });

    const r = await Category.updateOne(
      { _id: new mongoose.Types.ObjectId(categoryId) },
      { $set: { attributes: updatedAttributes } },
    );
    console.log({ r, updatedAttributes });

    revalidatePath("/categories");
    return { success: true, attributes: updatedAttributes };
  } catch (error: any) {
    console.error("Error updating attributes:\n", error.message, error.stack);
    return { error: "Something went wrong." };
  }
}

export async function deleteCategory(id: string) {
  try {
    await connection();
    await Category.findByIdAndDelete(id);
    return { success: true, message: "Category deleted successfully" };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { error: "Could not delete the category." };
  }
}

export async function create_update_mapped_attributes_ids(
  id?: string | null,
  categoryId?: string | null,
  attributes?: any[],
) {
  await connection();

  if (id) {
    // Update existing CategoryAttribute doc
    await CategoryAttribute.findOneAndUpdate(
      { _id: id },
      { $set: { attributes } },
      { new: true, runValidators: true },
    ).exec();

    revalidatePath("/admin/categories");
  }

  if (!categoryId) {
    console.warn("Neither id nor categoryId provided—nothing to upsert.");
    return null;
  }

  // Check if CategoryAttribute doc already exists for the given categoryId
  const existingCategoryAttribute = await CategoryAttribute.findOne({
    category_id: categoryId,
  });

  if (existingCategoryAttribute) {
    // Update existing CategoryAttribute doc by adding new attributes to existing ones
    const updatedAttributes = Array.from(
      new Set([...existingCategoryAttribute.attributes, ...(attributes || [])]),
    );

    await CategoryAttribute.findOneAndUpdate(
      { category_id: categoryId },
      { $set: { attributes: updatedAttributes } },
      { new: true, runValidators: true },
    ).exec();

    revalidatePath("/admin/categories");
  }

  // Create a new CategoryAttribute doc
  const newCategoryAttribute = new CategoryAttribute({
    category_id: categoryId,
    attributes,
  });

  await newCategoryAttribute.save();

  revalidatePath("/admin/categories");
}

export async function find_mapped_attributes_ids(
  categoryId: string | null = null,
) {
  if (!categoryId) return [];

  await connection();

  const catObjectId = new Types.ObjectId(categoryId);
  const categories = await Category.aggregate([
    { $match: { _id: catObjectId } },
    {
      $graphLookup: {
        from: "categories",
        startWith: "$parent_id",
        connectFromField: "parent_id",
        connectToField: "_id",
        as: "ancestors",
      },
    },
    {
      $project: {
        allAttributes: {
          $setUnion: [
            "$attributes",
            {
              $reduce: {
                input: "$ancestors.attributes",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
          ],
        },
      },
    },
  ]);

  const attributeIds = categories.length > 0 ? categories[0].allAttributes : [];

  const groups = await AttributeGroup.find({
    attributes: { $in: attributeIds },
  })
    .populate({ path: "attributes" })
    .lean();

  // Filter each group to only include attributes that are in attributeIds
  const filteredGroups = groups.map((group) => {
    const filteredAttributes = group.attributes.filter((attr: any) =>
      attributeIds.some((id: any) => id.toString() === attr._id.toString()),
    );

    return {
      ...group,
      attributes: filteredAttributes,
    };
  });

  return filteredGroups;
}

export async function getMappedAttributeGroups(categoryId: string) {
  if (!categoryId) return [];
  await connection();

  const category = (await Category.findById(categoryId)
    .populate({
      path: "attribute_sets_ids",
      populate: {
        path: "attributeGroup",
        populate: {
          path: "attributes",
          model: "Attribute",
        },
      },
    })
    .lean()
    .exec()) as { attribute_sets_ids?: any[] } | null;

  if (!category) return [];

  // Flatten all groups from all mapped sets
  const allGroups = category.attribute_sets_ids?.flatMap(
    (set: any) => set.attributeGroup || [],
  );

  // Deduplicate groups by _id
  const uniqueGroups = Array.from(
    new Map(allGroups?.map((g: any) => [g._id.toString(), g])).values(),
  );

  // Build a set of all group IDs for orphan detection
  const allGroupIds = new Set(uniqueGroups.map((g) => g._id.toString()));

  // Build tree; pass the set so orphans become roots
  const tree = buildGroupTreeWithValues(uniqueGroups, allGroupIds);

  // Additional: convert each group's attributes to plain objects already done inside buildGroupTreeWithValues
  return tree;
}

export async function updateCategoryAttributeSets(
  categoryId: string,
  attributeSetIds: string[], // new array of set IDs
): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!categoryId) return { error: "Category ID is required." };
    await connection();

    const existingCategory = await Category.findById(categoryId);
    if (!existingCategory) return { error: "Category not found." };

    // Replace the entire attribute_sets_ids array
    await Category.updateOne(
      { _id: categoryId },
      { $set: { attribute_sets_ids: attributeSetIds } },
    );

    revalidatePath("/categories");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating attribute sets:\n", error.message);
    return { error: "Something went wrong." };
  }
}

const buildGroupTreeWithValues = (
  groups: any[],
  allGroupIds: Set<string>,
  parentId: string | null = null,
): any[] => {
  const filtered = groups.filter((group) => {
    const groupParent = group.parent_id?.toString();
    if (parentId === null) {
      return !groupParent || !allGroupIds.has(groupParent);
    } else {
      return groupParent === parentId;
    }
  });

  return filtered
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) // ⬅️ sort by sort_order
    .map((group) => ({
      _id: group._id.toString(),
      code: group.code,
      name: group.name,
      parent_id: group.parent_id?.toString() || null,
      sort_order: group.sort_order, // ⬅️ use sort_order (was group_order)
      attributes: group.attributes.map((attr: any) => ({
        _id: attr._id.toString(),
        code: attr.code,
        name: attr.name,
        option: attr.option || [],
        type: attr.type,
        isRequired: attr.isRequired || false,
        unit: attr.unit,
        unitFamily: attr.unitFamily
          ? {
              _id: attr.unitFamily._id.toString(),
              name: attr.unitFamily.name,
              baseUnit: attr.unitFamily.baseUnit,
            }
          : null,
      })),
      children: buildGroupTreeWithValues(
        groups,
        allGroupIds,
        group._id.toString(),
      ),
    }));
};

export async function getCategoryAttributeSets(categoryId: string) {
  if (!categoryId) return [];
  await connection();

  const category = await Category.findById(categoryId)
    .populate({
      path: "attribute_sets_ids",
      populate: {
        path: "attributeGroup",
        populate: {
          path: "attributes",
          model: "Attribute",
        },
      },
    })
    .lean()
    .exec();

  if (!category || Array.isArray(category)) return [];

  const sets = category.attribute_sets_ids || [];

  // ⬇️ Sort attribute sets by sort_order
  sets.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

  return sets.map((set: any) => {
    const groups = set.attributeGroup || [];
    const uniqueGroups = Array.from(
      new Map(groups.map((g: any) => [g._id.toString(), g])).values(),
    );
    const allGroupIds = new Set(uniqueGroups.map((g: any) => g._id.toString()));
    const tree = buildGroupTreeWithValues(uniqueGroups, allGroupIds);
    return {
      _id: set._id.toString(),
      title: set.title,
      code: set.code,
      groups: tree,
    };
  });
}
