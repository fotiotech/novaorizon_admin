"use server";

import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import mongoose from "mongoose";

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
    console.log("Categories:", categories);
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
  },
  id?: string | null
) {
  try {
    const { _id, categoryName, description, imageUrl } = formData;

    if (!categoryName) return { error: "Category name is required." };

    const url_slug = generateSlug(categoryName + (description || ""));

    await connection();

    const parent_id = _id ? new mongoose.Types.ObjectId(_id) : undefined;

    if (id) {
      const updatedCategory = await Category.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            url_slug,
            categoryName,
            parent_id,
            description,
            imageUrl: imageUrl || undefined,
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
