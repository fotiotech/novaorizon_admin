"use server";

import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import mongoose, { Types } from "mongoose";
import CategoryAttribute from "@/models/CategoryAttribute";
import { revalidatePath } from "next/cache";
import AttributeGroup from "@/models/AttributesGroup";
import Attribute from "@/models/Attributes";

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
    const mapping = await CategoryAttribute.findById(id)
      .populate({
        path: "attributes",
        populate: { path: "groupId", model: "AttributeGroup" },
      })
      .lean<({ attributes: Attribute[] } & mongoose.Document) | null>();

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
    const docs = await CategoryAttribute.find({ category_id: { $in: allIds } })
      .populate({
        path: "attributes",
        populate: { path: "groupId", model: "AttributeGroup" },
      })
      .lean<{ attributes: Attribute[] }[]>();

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
  const allMappings = await CategoryAttribute.find()
    .populate({
      path: "attributes",
      populate: { path: "groupId", model: "AttributeGroup" },
    })
    .lean<{ attributes: Attribute[] }[]>();

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

interface AttributeDoc {
  _id: Types.ObjectId;
  name: string;
  option?: string[];
  type: string;
  groupId: Types.ObjectId;
}

interface GroupDoc {
  _id: Types.ObjectId;
  name: string;
  parent_id?: Types.ObjectId;
}


export async function getAttributesByCategoryAndGroupName(
  categoryId: string,
  groupName: string
): Promise<
  | AttributeDoc[]
  | {
      group: { _id: Types.ObjectId; name: string };
      attributes: AttributeDoc[];
      children: Array<{
        group: { _id: Types.ObjectId; name: string };
        attributes: AttributeDoc[];
      }>;
    }
  | null
> {
  // Convert the string → ObjectId
  let objectCategoryId: Types.ObjectId;
  try {
    objectCategoryId = new Types.ObjectId(categoryId);
  } catch (e) {
    console.error("Invalid categoryId passed:", categoryId, e);
    return null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 1) Efficiently collect this category + ALL ancestors via a single aggregation
  //    (instead of a while-loop). If there is a cycle, we force-break after 20 hops.
  // ────────────────────────────────────────────────────────────────────────────
  console.log("→ [Step 1] Running $graphLookup to find ancestors of", objectCategoryId);
  let allCategoryIds: Types.ObjectId[] = [];
  try {
    const result = await Category.aggregate<{ ancestors: Types.ObjectId[] }>([
      { $match: { _id: objectCategoryId } },
      {
        $graphLookup: {
          from: "categories",            // Mongo collection name for Category
          startWith: "$parent_id",
          connectFromField: "parent_id",
          connectToField: "_id",
          as: "ancestors",
          maxDepth: 20,                  // force‐break if deeper than 20
        },
      },
      // Project so that “ancestors” array + self‐ID is easy to read
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
    ]) as any;

    if (!result.length) {
      console.warn("No category found with _id =", objectCategoryId);
      return null;
    }
    allCategoryIds = result[0].allAncestors;
    console.log("→ [Step 1] Found ancestors (incl self):", allCategoryIds);
  } catch (err) {
    console.error("Error during $graphLookup for ancestors:", err);
    return null;
  }

  // If we got back an empty array for some reason, bail
  if (!allCategoryIds || allCategoryIds.length === 0) {
    console.warn("[Step 1] No ancestors or self found; returning null");
    return null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2) Gather all CategoryAttribute docs whose `category_id` is in that list
  // ────────────────────────────────────────────────────────────────────────────
  console.log("→ [Step 2] Finding CategoryAttribute docs for categories:", allCategoryIds);
  let catAttrDocs: Array<{ attributes: Types.ObjectId[] }> = [];
  try {
    catAttrDocs = await CategoryAttribute.find({
      category_id: { $in: allCategoryIds },
    }).select("attributes").lean();
    console.log("→ [Step 2] Found", catAttrDocs.length, "CategoryAttribute docs");
  } catch (err) {
    console.error("Error fetching CategoryAttribute for ancestors:", err);
    return null;
  }

  if (!catAttrDocs.length) {
    console.warn("[Step 2] No CategoryAttribute docs at all for these categories");
    return null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3) Compile a deduplicated Set of all attribute ObjectIds from every doc
  // ────────────────────────────────────────────────────────────────────────────
  const allAttributeIdsSet = new Set<string>();
  for (const doc of catAttrDocs) {
    for (const attrId of doc.attributes || []) {
      allAttributeIdsSet.add(attrId.toString());
    }
  }
  if (!allAttributeIdsSet.size) {
    console.warn("[Step 3] CategoryAttribute entries exist, but no attribute IDs inside");
    return null;
  }
  const allAttributeIds = Array.from(allAttributeIdsSet).map((s) => new Types.ObjectId(s));
  console.log("→ [Step 3] Total unique attribute IDs:", allAttributeIds.length);

  // ────────────────────────────────────────────────────────────────────────────
  // 4) Fetch all Attribute documents in one go
  // ────────────────────────────────────────────────────────────────────────────
  console.log("→ [Step 4] Loading all Attribute docs via Attribute.find({ _id: { $in: [...] } })");
  let allAttributes: (AttributeDoc & { _id: Types.ObjectId })[] = [];
  try {
    allAttributes = await Attribute.find({ _id: { $in: allAttributeIds } })
      .select("_id name option type groupId")
      .lean();
    console.log("→ [Step 4] Found", allAttributes.length, "Attribute docs");
  } catch (err) {
    console.error("Error fetching Attribute docs:", err);
    return null;
  }
  if (!allAttributes.length) {
    console.warn("[Step 4] None of those attribute IDs exist in Attribute collection");
    return null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 5) Build a Map<groupId, GroupDoc> for easy lookups, and fetch only needed groups
  // ────────────────────────────────────────────────────────────────────────────
  const uniqueGroupIds = Array.from(
    new Set(allAttributes.map((a) => a.groupId.toString()))
  ).map((s) => new Types.ObjectId(s));

  console.log("→ [Step 5] Finding AttributeGroup docs for groupIds:", uniqueGroupIds);
  let allGroups: GroupDoc[] = [];
  try {
    allGroups = await AttributeGroup.find({ _id: { $in: uniqueGroupIds } })
      .select("_id name parent_id")
      .lean();
    console.log("→ [Step 5] Found", allGroups.length, "AttributeGroup docs");
  } catch (err) {
    console.error("Error fetching AttributeGroup docs:", err);
    return null;
  }
  if (!allGroups.length) {
    console.warn("[Step 5] None of the groupIds exist in AttributeGroup");
    return null;
  }
  const groupMap = new Map<string, GroupDoc>();
  for (const g of allGroups) {
    groupMap.set(g._id.toString(), g);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 6) Identify the target groupName among those groups
  // ────────────────────────────────────────────────────────────────────────────
  console.log(`→ [Step 6] Looking for a group whose name === "${groupName}"`);
  let parentGroup: GroupDoc | null = allGroups.find((g) => g.name === groupName) || null;
  if (!parentGroup) {
    try {
      parentGroup = await AttributeGroup.findOne({ name: groupName })
        .select("_id name parent_id")
        .lean();
      console.log("→ [Step 6] Fetched parentGroup by findOne:", parentGroup);
    } catch (err) {
      console.error("[Step 6] Error fetching groupName via findOne:", err);
      return null;
    }
  }
  if (!parentGroup) {
    console.warn(`[Step 6] No AttributeGroup found with name="${groupName}"`);
    return null;
  }
  const isTopParent = !parentGroup.parent_id;
  console.log("→ [Step 6] parentGroup:", parentGroup, "isTopParent?", isTopParent);

  // ────────────────────────────────────────────────────────────────────────────
  // 7) If it’s a leaf group (parent_id ≠ null), filter and return a flat list
  // ────────────────────────────────────────────────────────────────────────────
  if (!isTopParent) {
    console.log(`→ [Step 7] "${groupName}" is a leaf. Returning flat AttributeDoc[].`);
    const leafAttrs = allAttributes
      .filter((attr) => attr.groupId.equals(parentGroup!._id))
      .map((attr) => ({
        _id: attr._id,
        name: attr.name,
        option: attr.option,
        type: attr.type,
        groupId: attr.groupId,
      }));
    console.log("→ [Step 7] leafAttrs.length =", leafAttrs.length);
    return leafAttrs.length ? leafAttrs : null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 8) If top‐level, fetch its direct children
  // ────────────────────────────────────────────────────────────────────────────
  console.log(`→ [Step 8] "${groupName}" is top‐level. Finding its direct child groups.`);
  let childGroups: GroupDoc[] = [];
  try {
    childGroups = await AttributeGroup.find({ parent_id: parentGroup._id })
      .select("_id name")
      .lean();
    console.log("→ [Step 8] childGroups:", childGroups.length);
  } catch (err) {
    console.error("Error fetching child groups:", err);
    return null;
  }

  // Initialize a map: childGroupId → [] of AttributeDoc
  const childAttrMap = new Map<string, AttributeDoc[]>();
  for (const cg of childGroups) {
    childAttrMap.set(cg._id.toString(), []);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 9) Partition allAttributes into “parent‐level” vs “child‐level”
  // ────────────────────────────────────────────────────────────────────────────
  const parentAttributes: AttributeDoc[] = [];
  console.log("→ [Step 9] Partitioning allAttributes by groupId");
  for (const attr of allAttributes) {
    if (attr.groupId.equals(parentGroup._id)) {
      parentAttributes.push({
        _id: attr._id,
        name: attr.name,
        option: attr.option,
        type: attr.type,
        groupId: attr.groupId,
      });
    } else {
      const key = attr.groupId.toString();
      if (childAttrMap.has(key)) {
        childAttrMap.get(key)!.push({
          _id: attr._id,
          name: attr.name,
          option: attr.option,
          type: attr.type,
          groupId: attr.groupId,
        });
      }
    }
  }
  console.log("→ [Step 9] parentAttributes.length =", parentAttributes.length);

  const childrenStructured: Array<{
    group: { _id: Types.ObjectId; name: string };
    attributes: AttributeDoc[];
  }> = [];
  for (const child of childGroups) {
    childrenStructured.push({
      group: { _id: child._id, name: child.name },
      attributes: childAttrMap.get(child._id.toString()) || [],
    });
  }
  console.log(
    "→ [Step 9] childrenStructured:",
    childrenStructured.map((c) => ({
      group: c.group.name,
      count: c.attributes.length,
    }))
  );

  // ────────────────────────────────────────────────────────────────────────────
  // 10) Return the nested payload
  // ────────────────────────────────────────────────────────────────────────────
  return {
    group: { _id: parentGroup._id, name: parentGroup.name },
    attributes: parentAttributes,
    children: childrenStructured,
  };
}

