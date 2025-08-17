"use server";

import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import mongoose, { Types } from "mongoose";
import CategoryAttribute from "@/models/CategoryAttribute";
import { revalidatePath } from "next/cache";
import AttributeGroup from "@/models/AttributesGroup";
import Attribute from "@/models/Attributes";
import { AttributeGroupResult } from "./type";

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

interface Attribute {
  _id: Types.ObjectId;
  groupId?: {
    _id: Types.ObjectId;
  };
  // other attribute fields
}

interface GroupNode {
  _id: string;
  code: string;
  name: string;
  parent_id?: Types.ObjectId;
  group_order: number;
  attributes: Attribute[];
  subgroups: GroupNode[];
}

export async function find_mapped_attributes_ids(
  id: string | null = null,
  categoryId: string | null = null
): Promise<GroupNode[]> {
  // Ensure database connection is established
  await connection();

  // 1) Direct mapping by CategoryAttribute ID
  if (id) {
    const mapping = await CategoryAttribute.findById(id).lean<
      ({ attributes: Attribute[] } & mongoose.Document) | null
    >();

    return mapping ? buildGroupTree(mapping.attributes) : [];
  }

  // 2) Mapping by category and its ancestor categories
  if (categoryId) {
    const catObjectId = new Types.ObjectId(categoryId);
    const result = await Category.aggregate<{ allIds: Types.ObjectId[] }>([
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
      { $project: { allIds: { $concatArrays: [["$_id"], "$ancestors._id"] } } },
    ]);

    const allIds = result[0]?.allIds ?? [catObjectId];
    const docs = await CategoryAttribute.find({
      category_id: { $in: allIds },
    }).lean<{ attributes: Attribute[] }[]>();

    // Deduplicate attributes
    const mergedAttrs: Attribute[] = docs.flatMap((d) => d.attributes || []);
    const uniqueAttrs = Array.from(
      mergedAttrs
        .reduce(
          (map, attr) => map.set(attr._id.toString(), attr),
          new Map<string, Attribute>()
        )
        .values()
    );

    return buildGroupTree(uniqueAttrs);
  }

  // 3) Fallback: all mappings
  const allMappings = await CategoryAttribute.find().lean<
    { attributes: Attribute[] }[]
  >();

  const allAttrs: Attribute[] = allMappings.flatMap((m) => m.attributes || []);
  const uniqueAttrs = Array.from(
    allAttrs
      .reduce(
        (map, attr) => map.set(attr._id.toString(), attr),
        new Map<string, Attribute>()
      )
      .values()
  );

  return buildGroupTree(uniqueAttrs);
}

async function buildGroupTree(attributes: Attribute[]): Promise<GroupNode[]> {
  // 1) Load all groups sorted by group_order
  const allGroups = await AttributeGroup.find()
    .sort("group_order")
    .lean<GroupNode[]>();

  // 2) Initialize nodes map
  const nodes: Record<string, GroupNode> = allGroups.reduce((acc, g) => {
    acc[g._id.toString()] = {
      _id: g._id,
      code: g.code,
      name: g.name,
      parent_id: g.parent_id,
      group_order: g.group_order,
      attributes: [],
      subgroups: [],
    };
    return acc;
  }, {} as Record<string, GroupNode>);

  // 3) Build hierarchy
  const roots: GroupNode[] = [];
  allGroups.forEach((g) => {
    const key = g._id.toString();
    if (g.parent_id) {
      const parentKey = g.parent_id.toString();
      nodes[parentKey].subgroups.push(nodes[key]);
    } else {
      roots.push(nodes[key]);
    }
  });

  // 4) Attach attributes
  attributes.forEach((attr) => {
    const gid = attr.groupId?._id.toString();
    if (gid && nodes[gid]) {
      nodes[gid].attributes.push(attr);
    }
  });

  // 5) Sort and prune empty groups
  function recurse(list: GroupNode[]): GroupNode[] {
    return list
      .map((node) => {
        node.subgroups = recurse(node.subgroups).sort(
          (a, b) => a.group_order - b.group_order
        );
        return node;
      })
      .filter((node) => node.attributes.length > 0 || node.subgroups.length > 0)
      .sort((a, b) => a.group_order - b.group_order);
  }

  return recurse(roots);
}

export async function getAttributesByCategoryAndGroupName(
  categoryId: string,
  code?: string
) {
  let objectCategoryId: Types.ObjectId;
  try {
    objectCategoryId = new Types.ObjectId(categoryId);
  } catch (e) {
    console.error("Invalid categoryId passed:", categoryId, e);
    return null;
  }

  const result = await Category.aggregate<{
    allAncestors: Types.ObjectId[];
  }>([
    { $match: { _id: objectCategoryId } },
    {
      $graphLookup: {
        from: "categories",
        startWith: "$parent_id",
        connectFromField: "parent_id",
        connectToField: "_id",
        as: "ancestors",
        maxDepth: 20,
      },
    },
    {
      $project: {
        _id: 1,
        allAncestors: {
          $concatArrays: [
            ["$_id"],
            { $map: { input: "$ancestors", as: "a", in: "$$a._id" } },
          ],
        },
      },
    },
  ]);

  if (!result.length) return null;

  const allCategoryIds = result[0].allAncestors;
  const catAttrDocs = await CategoryAttribute.find({
    category_id: { $in: allCategoryIds },
  })
    .select("attributes")
    .lean();

  if (!catAttrDocs.length) return null;

  const allAttributeIdsSet = new Set<string>();
  for (const doc of catAttrDocs) {
    for (const attrId of doc.attributes || []) {
      allAttributeIdsSet.add(attrId.toString());
    }
  }

  const allAttributeIds = Array.from(allAttributeIdsSet).map(
    (s) => new Types.ObjectId(s)
  );

  const allGroups = await AttributeGroup.find({
    attributes: { $elemMatch: { $in: allAttributeIds } },
  })
    .select("_id code name parent_id attributes group_order")
    .lean();

  if (!allGroups.length) return null;

  const groupMap = new Map();
  for (const g of allGroups) {
    groupMap.set(g._id as string, g);
  }

  let parentGroup = allGroups.find((g) => g.code === code) || null;
  if (!parentGroup) {
    parentGroup = await AttributeGroup.findOne({ code })
      .select("_id name parent_id attributes group_order")
      .lean();
  }

  if (!parentGroup) return null;

  const isTopParent = !parentGroup.parent_id;

  const attributesById = new Map();
  const rawAttributes = await Attribute.find({ _id: { $in: allAttributeIds } })
    .select("_id name option type groupId")
    .lean();
  rawAttributes.forEach((attr: any) =>
    attributesById.set(attr._id.toString(), attr)
  );

  if (!isTopParent) {
    const leafAttrs = (parentGroup.attributes || [])
      .filter((id: string) => attributesById.has(id.toString()))
      .map((id: string) => attributesById.get(id.toString())!);

    return leafAttrs.length ? leafAttrs : null;
  }

  const childGroups = await AttributeGroup.find({ parent_id: parentGroup._id })
    .select("_id name attributes group_order")
    .sort({ group_order: 1 })
    .lean();

  const parentAttributes = (parentGroup.attributes || [])
    .filter((id: string) => attributesById.has(id.toString()))
    .map((id: string) => attributesById.get(id.toString())!);

  const childrenStructured = childGroups.map((child) => ({
    group: { _id: child._id, name: child.name, group_order: child.group_order },
    attributes: (child.attributes || [])
      .filter((id: string) => attributesById.has(id.toString()))
      .map((id: string) => attributesById.get(id.toString())!),
  }));

  return {
    group: {
      _id: parentGroup._id,
      code: parentGroup.code,
      name: parentGroup.name,
      group_order: parentGroup.group_order,
    },
    attributes: parentAttributes,
    children: childrenStructured,
  };
}
