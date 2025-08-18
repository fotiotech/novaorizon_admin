"use server";

import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import mongoose, { Types } from "mongoose";
import CategoryAttribute from "@/models/CategoryAttribute";
import { revalidatePath } from "next/cache";
import AttributeGroup from "@/models/AttributesGroup";
import "@/models/Attributes";

function generateSlug(name: string) {
  return slugify(name, { lower: true });
}

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
    console.log("Subcategories:", subCategories);
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
    categoryName?: string;
    parent_id?: string;
    description?: string;
    imageUrl?: string[];
    attributes?: string[];
  },
  id?: string | null
) {
  try {
    const { categoryName, parent_id, description, imageUrl, attributes } =
      formData;

    const url_slug = generateSlug(categoryName + (description || ""));
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
            categoryName,
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
        categoryName,
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

    // Merge old and new attributes without duplicates
    const updatedAttributes: string[] = Array.from(
      new Set([
        ...(existingCategory.attributes || []),
        ...newAttributes.map((id: string) => id.toString()),
      ])
    );

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

  return groups;
}

export async function find_category_attribute_groups(
  categoryId: string | null = null
) {
  if (!categoryId) return [];
  await connection();

  const catObjectId = new Types.ObjectId(categoryId);

  // 1️⃣ Get category and ancestor attribute IDs from Category.attributes directly
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
  console.log("attributeIds (category + ancestors)", attributeIds);

  // 2️⃣ Find groups containing any of these attributes and populate attributes
  const groups = await AttributeGroup.find({
    attributes: { $in: attributeIds },
  })
    .populate({ path: "attributes", options: { sort: { sort_order: 1 } } })
    .lean();

  // Sort all groups by group_order first
  groups.sort((a, b) => (a.group_order || 0) - (b.group_order || 0));

  // 3️⃣ Build tree structure based on parent_id
  const groupMap = new Map();
  groups.forEach((g) => groupMap.set(String(g._id), { ...g, children: [] }));

  const rootGroups: any = [];
  groups.forEach((g) => {
    if (g.parent_id && groupMap.has(String(g.parent_id))) {
      const parent = groupMap.get(String(g.parent_id));
      parent.children.push(groupMap.get(String(g._id)));
      // Ensure children are sorted by sort_order
      parent.children.sort(
        (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
      );
    } else {
      rootGroups.push(groupMap.get(String(g._id)));
    }
  });

  // rootGroups already sorted by group_order due to previous sort
  return rootGroups; // This can be paginated directly
}
