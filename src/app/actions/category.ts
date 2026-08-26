// app/actions/category.ts

"use server";

import mongoose, { Types } from "mongoose";
import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import CategoryProperty, { ICategoryProperty } from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import Attribute from "@/models/Attribute";
import AttributeGroup from "@/models/AttributeGroup";
import "@/models/UnitFamily";
import { revalidatePath } from "next/cache";
import { deleteS3Object } from "./s3";

// ---------- Helper: Deep Serialize ----------
function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Handle Mongoose ObjectId
  if (
    obj instanceof mongoose.Types.ObjectId ||
    obj._bsontype === "ObjectId" ||
    typeof obj.toHexString === "function"
  ) {
    return obj.toString();
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serialize);
  }

  // Handle plain objects
  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serialize(obj[key]);
    }
    return result;
  }

  // Primitives (string, number, boolean, etc.)
  return obj;
}

// ---------- Helper: Slug ----------
function generateSlug(name: string) {
  return slugify(name, { lower: true });
}

// ---------- Category Property CRUD ----------
export async function getCategoryProperty(id?: string) {
  await connection();
  if (id) {
    const property = await CategoryProperty.findById(id).lean();
    if (!property) return null;
    return serialize(property);
  } else {
    const properties = await CategoryProperty.find().lean();
    return serialize(properties);
  }
}

export async function createCategoryPropertyWithMappings(data: {
  code: string;
  name: string;
  description?: string;
  mappings: {
    set: string;
    groups: {
      group: string;
      attributes: {
        attribute: string;
        isRequired: boolean;
      }[];
    }[];
  }[];
}) {
  await connection();
  const { code, name, description, mappings } = data;

  // Validate all referenced IDs exist
  for (const m of mappings) {
    const setExists = await AttributeSet.findById(m.set);
    if (!setExists) return { error: `Set ${m.set} not found` };
    for (const g of m.groups) {
      const groupExists = await AttributeGroup.findById(g.group);
      if (!groupExists) return { error: `Group ${g.group} not found` };
      for (const a of g.attributes) {
        const attrExists = await Attribute.findById(a.attribute);
        if (!attrExists) return { error: `Attribute ${a.attribute} not found` };
      }
    }
  }

  let property = await CategoryProperty.findOne({ code });

  if (property) {
    property.name = name;
    if (description !== undefined) property.description = description;
    property.mappings = mappings.map((m) => ({
      set: new mongoose.Types.ObjectId(m.set),
      groups: m.groups.map((g) => ({
        group: new mongoose.Types.ObjectId(g.group),
        attributes: g.attributes.map((a) => ({
          attribute: new mongoose.Types.ObjectId(a.attribute),
          isRequired: a.isRequired,
        })),
      })),
    }));
    await property.save();
  } else {
    property = new CategoryProperty({
      code,
      name,
      description,
      mappings: mappings.map((m) => ({
        set: new mongoose.Types.ObjectId(m.set),
        groups: m.groups.map((g) => ({
          group: new mongoose.Types.ObjectId(g.group),
          attributes: g.attributes.map((a) => ({
            attribute: new mongoose.Types.ObjectId(a.attribute),
            isRequired: a.isRequired,
          })),
        })),
      })),
    });
    await property.save();
  }

  revalidatePath("/catalog/categories/property");

  const plain = property.toObject();
  // Convert to plain object (already has ObjectId and Date), then serialize
  return { success: true, property: serialize(plain) };
}

export async function updateCategoryPropertyWithMappings(
  id: string,
  data: {
    code?: string;
    name?: string;
    description?: string;
    mappings?: {
      set: string;
      groups: {
        group: string;
        attributes: {
          attribute: string;
          isRequired: boolean;
        }[];
      }[];
    }[];
  },
) {
  await connection();
  const property = await CategoryProperty.findById(id);
  if (!property) return { error: "Category property not found" };

  if (data.code) {
    const existing = await CategoryProperty.findOne({ code: data.code });
    if (existing && existing._id.toString() !== id) {
      return {
        error: `Code "${data.code}" is already used by another property.`,
      };
    }
    property.code = data.code;
  }

  if (data.name) property.name = data.name;
  if (data.description !== undefined) property.description = data.description;
  if (data.mappings) {
    property.mappings = data.mappings.map((m) => ({
      set: new mongoose.Types.ObjectId(m.set),
      groups: m.groups.map((g) => ({
        group: new mongoose.Types.ObjectId(g.group),
        attributes: g.attributes.map((a) => ({
          attribute: new mongoose.Types.ObjectId(a.attribute),
          isRequired: a.isRequired,
        })),
      })),
    }));
  }

  await property.save();
  revalidatePath("/catalog/categories/property");

  const plain = property.toObject();
  return { success: true, property: serialize(plain) };
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

// ---------- Category CRUD ----------
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
      return serialize(subCategories);
    }
    return [];
  } else if (id) {
    const category = await Category.findById(id).populate("property").lean();
    if (!category) return null;
    return serialize(category);
  } else if (parentId) {
    const subCategories = await Category.find({ parent_id: parentId })
      .populate("property")
      .lean();
    return serialize(subCategories);
  } else {
    const categories = await Category.find().populate("property").lean();
    return serialize(categories);
  }
}

/**
 * Collect all property mappings from a category and its ancestors.
 * Returns merged mappings and the list of property IDs.
 */
async function collectAncestorProperties(categoryId: string): Promise<{
  mappings: any[];
  propertyIds: string[];
}> {
  await connection();
  const propertyIds: string[] = [];
  let current: any = await Category.findById(categoryId)
    .populate("property")
    .lean();
  let depth = 0;
  while (current && depth < 10) {
    if (current.property) {
      propertyIds.push(current.property._id.toString());
    }
    if (!current.parent_id) break;
    current = await Category.findById(current.parent_id)
      .populate("property")
      .lean();
    depth++;
  }

  if (propertyIds.length === 0) {
    return { mappings: [], propertyIds: [] };
  }

  const properties = await CategoryProperty.find({
    _id: { $in: propertyIds },
  }).lean();

  const combinedMap = new Map<
    string,
    {
      set: string;
      groups: Map<
        string,
        {
          group: string;
          attributes: Map<string, boolean>;
        }
      >;
    }
  >();

  for (const prop of properties.reverse()) {
    if (!prop.mappings) continue;
    for (const mapping of prop.mappings) {
      const setKey = mapping.set.toString();
      if (!combinedMap.has(setKey)) {
        combinedMap.set(setKey, { set: setKey, groups: new Map() });
      }
      const setData = combinedMap.get(setKey)!;
      for (const gm of mapping.groups) {
        const groupKey = gm.group.toString();
        if (!setData.groups.has(groupKey)) {
          setData.groups.set(groupKey, {
            group: groupKey,
            attributes: new Map(),
          });
        }
        const groupData = setData.groups.get(groupKey)!;
        for (const am of gm.attributes) {
          const attrKey = am.attribute.toString();
          groupData.attributes.set(attrKey, am.isRequired);
        }
      }
    }
  }

  const mergedMappings = Array.from(combinedMap.values()).map((setData) => ({
    set: setData.set,
    groups: Array.from(setData.groups.values()).map((groupData) => ({
      group: groupData.group,
      attributes: Array.from(groupData.attributes.entries()).map(
        ([attr, isRequired]) => ({
          attribute: attr,
          isRequired,
        }),
      ),
    })),
  }));

  return { mappings: mergedMappings, propertyIds };
}

function generatePropertyCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export async function createCategory(
  formData: {
    _id?: string;
    name?: string;
    parent_id?: string;
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
      parent_id,
      description,
      imageUrl,
      propertyId,
      inheritProperty,
    } = formData;
    const url_slug = generateSlug(name + (description || ""));
    await connection();

    let categoryId: string | null = null;

    const existingCategory = id ? await Category.findById(id) : null;

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
      categoryId = existingCategory._id.toString();
    } else {
      const newCategory = new Category({
        url_slug,
        name,
        parent_id: parent_id || null,
        description,
        imageUrl: imageUrl || [],
        property: propertyId || null,
      });
      const saved = await newCategory.save();
      categoryId = saved._id.toString();
    }

    console.log("[createCategory] Category saved with ID:", categoryId);
    console.log("[createCategory] inheritProperty:", inheritProperty);

    if (inheritProperty && categoryId) {
      const { mappings, propertyIds } =
        await collectAncestorProperties(categoryId);

      console.log("[createCategory] Found ancestor property IDs:", propertyIds);
      console.log("[createCategory] Merged mappings count:", mappings.length);

      if (mappings.length === 0) {
        console.warn(
          "[createCategory] No mappings found in ancestors. Cannot create inherited property.",
        );
        return {
          success: true,
          warning: "No ancestor properties found to inherit.",
        };
      }

      const baseCode = generatePropertyCode(name || "");
      const propertyDescription = `Auto-generated from ancestors`;

      const result = await createCategoryPropertyWithMappings({
        code: baseCode,
        name: name || "",
        description: propertyDescription,
        mappings,
      });

      if (!result.success) {
        console.error(
          "[createCategory] Failed to create inherited property:",
          result.error,
        );
        return { error: result.error || "Failed to create inherited property" };
      }

      const newProperty = result.property;
      console.log(
        "[createCategory] Created new property ID:",
        newProperty._id.toString(),
      );

      await Category.findByIdAndUpdate(categoryId, {
        $set: { property: newProperty._id },
      });

      revalidatePath("/categories");
      revalidatePath("/category-properties");
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

// ---------- Attribute Set / Group / Attribute Fetchers ----------
interface AttributeUnitFamily {
  id: string;
  name: string;
  baseUnit: string;
}

interface MappedAttribute {
  id: string;
  code: string;
  name: string;
  type: string;
  options: string[];
  isRequired: boolean;
  unitFamily: AttributeUnitFamily | null;
  sortOrder: number;
}

interface GroupNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  attributes: MappedAttribute[];
  children: GroupNode[];
}

interface AttributeSetResult {
  id: string;
  title: string;
  code: string;
  groups: GroupNode[];
}

/**
 * Build a hierarchical tree of groups and their selected attributes
 * from the mappings of a CategoryProperty.
 */
async function buildAttributeSetsFromMappings(
  mappings: {
    set: string;
    groups: {
      group: string;
      attributes: {
        attribute: string;
        isRequired: boolean;
      }[];
    }[];
  }[],
): Promise<AttributeSetResult[]> {
  const result: AttributeSetResult[] = [];

  for (const mapping of mappings) {
    // 1. Get the AttributeSet details (title, code)
    const set = await AttributeSet.findById(mapping.set).lean();
    if (!set) continue;

    // 2. Collect all group IDs from this mapping
    const groupIds = mapping.groups.map((g) => g.group);
    if (groupIds.length === 0) continue;

    // 3. Fetch all groups in one query
    const groups = await AttributeGroup.find({
      _id: { $in: groupIds },
    }).lean();

    // Build a map for quick lookup
    const groupMap: Record<string, any> = {};
    for (const g of groups) {
      groupMap[(g._id ?? "").toString()] = g;
    }

    // 4. Collect all attribute IDs from all groups in this mapping
    const attrIds: string[] = [];
    const attrRequiredMap: Record<string, boolean> = {};
    for (const gm of mapping.groups) {
      for (const am of gm.attributes) {
        attrIds.push(am.attribute);
        attrRequiredMap[am.attribute] = am.isRequired;
      }
    }

    // 5. Fetch all attributes in one query
    const attributes = await Attribute.find({
      _id: { $in: attrIds },
    })
      .populate("unitFamily")
      .lean();

    const attrMap: Record<string, any> = {};
    for (const a of attributes) {
      attrMap[(a._id ?? "").toString()] = a;
    }

    // 6. Build a lookup for groups to their attributes (selected ones)
    const groupAttrMap: Record<string, MappedAttribute[]> = {};
    for (const gm of mapping.groups) {
      const groupId = gm.group;
      const selectedAttrs: MappedAttribute[] = [];
      for (const am of gm.attributes) {
        const attrDoc = attrMap[am.attribute];
        if (!attrDoc) continue;
        selectedAttrs.push({
          id: attrDoc._id.toString(),
          code: attrDoc.code,
          name: attrDoc.name,
          type: attrDoc.type,
          options: attrDoc.option || [],
          isRequired: am.isRequired,
          unitFamily: attrDoc.unitFamily
            ? {
                id: attrDoc.unitFamily._id.toString(),
                name: attrDoc.unitFamily.name,
                baseUnit: attrDoc.unitFamily.baseUnit,
              }
            : null,
          sortOrder: attrDoc.sort_order ?? 0,
        });
      }
      groupAttrMap[groupId] = selectedAttrs;
    }

    // 7. Build tree recursively using the fetched groups
    const buildTree = (
      parentId: string | null = null,
      visited: Set<string> = new Set(),
    ): GroupNode[] => {
      const parentKey = parentId ?? "__ROOT__";
      if (visited.has(parentKey)) return [];
      visited.add(parentKey);

      // Find child groups (those whose parent_id matches parentId)
      const children = groups
        .filter((g) => {
          const gParent = g.parent_id?.toString() || null;
          if (parentId === null) {
            return gParent === null;
          }
          return gParent === parentId;
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((g) => {
          const gId = g._id?.toString();
          const attrs = groupAttrMap[gId ?? ""] || [];
          return {
            id: gId,
            code: g.code,
            name: g.name,
            parentId: g.parent_id?.toString() || null,
            sortOrder: g.sort_order ?? 0,
            attributes: attrs,
            children: buildTree(gId, new Set(visited)),
          };
        });

      return children as any;
    };

    // Build the full tree starting from root (null parent)
    const tree = buildTree(null);

    result.push({
      id: set._id.toString(),
      title: set.title,
      code: set.code,
      groups: tree,
    });
  }

  return result;
}

export async function getCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSetResult[]> {
  await connection();
  const category: any = await Category.findById(categoryId)
    .populate<{ property: ICategoryProperty }>("property")
    .lean();
  if (!category) return [];
  if (!category.property || !category.property.mappings) return [];
  return buildAttributeSetsFromMappings(category.property.mappings);
}

// ---------- Additional helpers ----------
export async function getAllAttributeSets() {
  await connection();
  const sets = await AttributeSet.find().select("_id title code").lean();
  return serialize(sets);
}

export async function getAllAttributeGroups() {
  await connection();
  const groups = await AttributeGroup.find().select("_id name code").lean();
  return serialize(groups);
}

export async function getAllAttributes() {
  await connection();
  const attrs = await Attribute.find().select("_id name code type").lean();
  return serialize(attrs);
}

/**
 * Delete a specific image URL from a category's imageUrl array
 * and remove the file from S3.
 */
export async function deleteCategoryImage(
  categoryId: string,
  imageUrl: string,
) {
  try {
    await connection();

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return { success: false, error: "Invalid category ID" };
    }

    // Find the category
    const category = await Category.findById(categoryId);
    if (!category) {
      return { success: false, error: "Category not found" };
    }

    // Ensure imageUrl is in the array
    if (!category.imageUrl?.includes(imageUrl)) {
      return { success: false, error: "Image not found in category" };
    }

    // Delete from S3
    await deleteS3Object(imageUrl);

    // Remove from the array
    category.imageUrl = category.imageUrl.filter(
      (url: string) => url !== imageUrl,
    );
    await category.save();

    revalidatePath("/categories"); // adjust path as needed

    return { success: true, data: category.imageUrl };
  } catch (error) {
    console.error("Error deleting category image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}
