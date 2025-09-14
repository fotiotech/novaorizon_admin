"use server";

import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import mongoose, { Types } from "mongoose";
import CategoryAttribute from "@/models/CategoryAttribute";
import { revalidatePath } from "next/cache";
import AttributeGroup from "@/models/AttributesGroup";
import "@/models/Attribute";

function generateSlug(name: string) {
  return slugify(name, { lower: true });
}

const buildGroupTreeWithValues = (
  groups: any[],
  parentId: string | null = null
): any[] => {
  return groups
    .filter(
      (group) =>
        (!parentId && !group.parent_id) ||
        (parentId && group.parent_id?.toString() === parentId)
    )
    .sort((a, b) => a.group_order - b.group_order)
    .map((group) => ({
      _id: group._id?.toString(),
      code: group.code,
      name: group.name,
      parent_id: group.parent_id?.toString(),
      group_order: group.group_order,
      attributes: group.attributes,
      children: buildGroupTreeWithValues(groups, group._id?.toString()),
    }));
};

export async function getCategory(
  id?: string | null,
  parentId?: string | null,
  name?: string | null
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
    attributes?: string[];
  },
  id?: string | null
) {
  try {
    const { name, parent_id, description, imageUrl, attributes } = formData;

    const url_slug = generateSlug(name + (description || ""));
    await connection();

    const existingCategory = id ? await Category.findById(id) : null;

    if (existingCategory) {
      // Merge existing and new attributes (avoid duplicates)
      const existingAttrs = existingCategory.attributes || [];
      const updatedAttrs = attributes
        ? Array.from(new Set([...existingAttrs, ...attributes.map(String)]))
        : existingAttrs;

      await Category.findOneAndUpdate(
        { _id: existingCategory._id },
        {
          $set: {
            url_slug,
            name,
            parent_id: parent_id || undefined,
            description,
            imageUrl: imageUrl || undefined,
            attributes: updatedAttrs,
          },
        }
      );
    } else {
      const newCategory = new Category({
        url_slug,
        name,
        parent_id,
        description,
        imageUrl: imageUrl || undefined,
        attributes: attributes?.map(String) || [],
      });
      await newCategory.save();
    }

    revalidatePath("/categories");
  } catch (error: any) {
    console.error(
      "Error while processing the request:\n",
      error.message,
      error.stack
    );
    return { error: "Something went wrong." };
  }
}

export async function updateCategoryAttributes(
  categoryId: string,
  newAttributes: string[] = []
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
      { $set: { attributes: updatedAttributes } }
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
  attributes?: any[]
) {
  await connection();

  if (id) {
    // Update existing CategoryAttribute doc
    await CategoryAttribute.findOneAndUpdate(
      { _id: id },
      { $set: { attributes } },
      { new: true, runValidators: true }
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
      new Set([...existingCategoryAttribute.attributes, ...(attributes || [])])
    );

    await CategoryAttribute.findOneAndUpdate(
      { category_id: categoryId },
      { $set: { attributes: updatedAttributes } },
      { new: true, runValidators: true }
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
  categoryId: string | null = null
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
    const filteredAttributes = group.attributes.filter((attr:any) =>
      attributeIds.some((id:any) => id.toString() === attr._id.toString())
    );

    return {
      ...group,
      attributes: filteredAttributes,
    };
  });

  return filteredGroups;
}

// TypeScript-friendly implementation
export async function find_category_attribute_groups(
  categoryId: string,
  groupId?: string | null
) {
  if (!categoryId) return [];
  await connection();

  const catObjectId = new Types.ObjectId(categoryId);

  // --- 1) build attributeIds as before (defensive aggregation) ---
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
            { $ifNull: ["$attributes", []] },
            {
              $reduce: {
                input: {
                  $map: {
                    input: { $ifNull: ["$ancestors", []] },
                    as: "a",
                    in: { $ifNull: ["$$a.attributes", []] },
                  },
                },
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
          ],
        },
      },
    },
  ]);

  const attributeIds = Array.isArray(categories?.[0]?.allAttributes)
    ? categories[0].allAttributes
    : [];
  if (attributeIds.length === 0) return [];

  if (groupId) {
    const group = await AttributeGroup.find({
      _id: new mongoose.Types.ObjectId(groupId),
      attributes: { $in: attributeIds },
    })
      .populate("attributes") // populate attributes here
      .lean();
    return buildGroupTreeWithValues([group[0]]);
  }

  const groups = await AttributeGroup.find({
    attributes: { $in: attributeIds },
  })
    .populate("attributes") // populate attributes here
    .lean();

  return buildGroupTreeWithValues(groups);
}
