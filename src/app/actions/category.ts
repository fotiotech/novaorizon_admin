"use server";

import slugify from "slugify";
import "@/models/Attributes";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import mongoose from "mongoose";
import CategoryAttribute from "@/models/CategoryAttribute";
import { revalidatePath } from "next/cache";

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

      const res = subCategories.map((subCategory) => ({
        ...subCategory.toObject(),
        _id: subCategory._id.toString(),
        parent_id: subCategory.parent_id.toString(),
        created_at: subCategory.created_at.toISOString(),
        updated_at: subCategory.updated_at.toISOString(),
      }));

      return res;
    }
  } else if (id) {
    const category = await Category.findById(id);
    if (category) {
      return {
        ...category.toObject(),
        _id: category._id.toString(),
        parent_id: category.parent_id.toString(),
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
        parent_id: subCategory.parent_id?.toString(),
        created_at: subCategory.created_at?.toISOString(),
        updated_at: subCategory.updated_at?.toISOString(),
      }));
    }
  } else {
    const categories = await Category.find();
    return categories.map((category) => ({
      ...category.toObject(),
      _id: category._id.toString(),
      parent_id: category.parent_id.toString(),
      created_at: category.created_at.toISOString(),
      updated_at: category.updated_at.toISOString(),
    }));
  }
}

export async function createCategory(
  formData: {
    _id?: string;
    categoryName?: string;
    description?: string;
    imageUrl?: string[];
    attributes?: any[];
  },
  id?: string | null,
  updateAttField?: string | null
) {
  try {
    const { _id, categoryName, description, imageUrl, attributes } = formData;

    if (!categoryName) return { error: "Category name is required." };

    const url_slug = generateSlug(categoryName + (description || ""));

    await connection();

    const parent_id = _id ? new mongoose.Types.ObjectId(_id) : undefined;

    const existingCategory = await Category.findOne({ _id: id });

    const updAttField = existingCategory?.attributes?.filter(
      (attr: string) => attr !== updateAttField
    );

    if (id) {
      await Category.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            url_slug,
            categoryName,
            parent_id,
            description,
            imageUrl: imageUrl || undefined,
            attributes: attributes?.map((ids) => ids.toString()) || undefined,
          },
        }
      );
    } else if (updateAttField && id) {
      await Category.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            url_slug,
            categoryName,
            parent_id,
            description,
            imageUrl: imageUrl || undefined,
            attributes:
              updAttField?.map((ids: any) => ids.toString()) || undefined,
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
        attributes: attributes || undefined,
      });
      await newCategory.save();
    }
  } catch (error: any) {
    console.error(
      "Error while processing the request:\n",
      error.message,
      error.stack
    );
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
  id?: string | null,
  categoryId?: string | null
) {
  await connection();

  console.log("categoryId :", categoryId);

  if (id) {
    const categoryAttribute = await CategoryAttribute.findById(id).populate(
      "attributes"
    );
    if (categoryAttribute) {
      return categoryAttribute.attributes;
    }
  }
  if (categoryId) {
     // Ensure ObjectId
  const catObjectId =
    typeof categoryId === 'string'
      ? new mongoose.Types.ObjectId(categoryId)
      : categoryId;

  // 1. Retrieve this category and its ancestors via graphLookup
  const [{ allIds } = { allIds: [catObjectId] }] =
    (await Category.aggregate([
      { $match: { _id: catObjectId } },
      {
        $graphLookup: {
          from: 'categories',
          startWith: '$parent_id',
          connectFromField: 'parent_id',
          connectToField: '_id',
          as: 'ancestors',
        },
      },
      {
        $project: {
          allIds: { $concatArrays: [['$_id'], '$ancestors._id'] },
        },
      },
    ]).exec()) as any[];

  // 2. Fetch CategoryAttribute docs for all related categories
  const attributeDocs = await CategoryAttribute.find({
    category_id: { $in: allIds },
  })
    .populate({
      path: 'attributes',
      model: 'Attribute',
      populate: { path: 'groupId', model: 'AttributeGroup' },
    })
    .lean()
    .exec();


  // Merge all attributes
  const merged = attributeDocs.flatMap(doc => doc.attributes || []);

  // Deduplicate by _id
  const seen = new Set<string>();
  const unique = merged.filter((attr: any) => {
    const id = String(attr._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // Sort by group_order, then sort_order
  unique.sort((a: any, b: any) => {
    const ag = a.groupId?.group_order ?? 0;
    const bg = b.groupId?.group_order ?? 0;
    if (ag !== bg) return ag - bg;
    const asort = a.groupId?.sort_order ?? 0;
    const bsort = b.groupId?.sort_order ?? 0;
    return asort - bsort;
  });
  return unique;

  }
  const categoryAttribute = await CategoryAttribute.find().populate(
    "attributes"
  );
  if (categoryAttribute) {
    return categoryAttribute.map((attr) => attr.attributes);
  }
}
