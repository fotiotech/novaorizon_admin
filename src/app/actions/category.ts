// app/actions/category.ts

"use server";

import mongoose, { Types } from "mongoose";
import slugify from "slugify";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import CategoryProperty, { ICategoryProperty } from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import Attribute from "@/models/Attribute";
import "@/models/AttributeGroup";
import "@/models/UnitFamily";
import { revalidatePath } from "next/cache";
import AttributeGroup from "@/models/AttributeGroup";

// ---------- Helper ----------
function generateSlug(name: string) {
  return slugify(name, { lower: true });
}

// ---------- Category Property CRUD (unchanged) ----------
export async function getCategoryProperty(id?: string) {
  await connection();
  if (id) {
    const property: any = await CategoryProperty.findById(id).lean();
    if (!property) return null;
    return {
      ...property,
      _id: property._id?.toString(),
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  } else {
    const properties = await CategoryProperty.find().lean();
    return properties.map((prop) => ({
      ...prop,
      _id: prop._id?.toString(),
      createdAt: prop.createdAt.toISOString(),
      updatedAt: prop.updatedAt.toISOString(),
    }));
  }
}

// ---------- Category Property CRUD (fixed) ----------

export async function createCategoryPropertyWithMappings(data: {
  code: string; // NEW: required
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

  // Check if a property with this code already exists
  let property = await CategoryProperty.findOne({ code });

  if (property) {
    // Update existing
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
    // Create new
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

  // Convert to plain object before returning
  const plain = property.toObject();
  plain._id = plain._id.toString();
  plain.createdAt = plain.createdAt.toISOString();
  plain.updatedAt = plain.updatedAt.toISOString();
  plain.mappings = plain.mappings.map((m: any) => ({
    ...m,
    set: m.set.toString(),
    groups: m.groups.map((g: any) => ({
      ...g,
      group: g.group.toString(),
      attributes: g.attributes.map((a: any) => ({
        ...a,
        attribute: a.attribute.toString(),
      })),
    })),
  }));

  return { success: true, property: plain };
}

export async function updateCategoryPropertyWithMappings(
  id: string,
  data: {
    code?: string; // NEW: optional, but if provided will update
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

  // If code is being updated, check uniqueness (except for this property)
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

  // Convert to plain object before returning
  const plain = property.toObject();
  plain._id = plain._id.toString();
  plain.createdAt = plain.createdAt.toISOString();
  plain.updatedAt = plain.updatedAt.toISOString();
  plain.mappings = plain.mappings.map((m: any) => ({
    ...m,
    set: m.set.toString(),
    groups: m.groups.map((g: any) => ({
      ...g,
      group: g.group.toString(),
      attributes: g.attributes.map((a: any) => ({
        ...a,
        attribute: a.attribute.toString(),
      })),
    })),
  }));

  return { success: true, property: plain };
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

  // Fetch all property documents
  const properties = await CategoryProperty.find({
    _id: { $in: propertyIds },
  }).lean();

  // Merge mappings: leaf overrides ancestors (process in reverse order)
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

  // Reverse so leaf (closest) overrides ancestors
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

  // Convert to array format
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
    .replace(/[^a-z0-9\s]/g, "") // remove special characters, keep letters, digits, spaces
    .trim()
    .replace(/\s+/g, "_"); // replace spaces with underscores
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

    // 1. Create or update the category
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

    // 2. If inheritProperty is true, merge ancestors' properties and create a new property
    if (inheritProperty && categoryId) {
      // Fetch ancestors and merge
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

      // Generate a unique code for the inherited property
      const baseCode = generatePropertyCode(name || ""); // e.g., "men_shoes"

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

      // Update the category's property field to this new property
      await Category.findByIdAndUpdate(categoryId, {
        $set: { property: newProperty._id },
      });

      // Revalidate paths
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

// ---------- Attribute Set Fetcher (unchanged) ----------
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
    const set = await AttributeSet.findById(mapping.set)
      .populate<{ groups: any[] }>("groups")
      .lean();
    if (!set) continue;

    const groupAttrMap = new Map<string, Map<string, boolean>>();
    const selectedGroupIds = new Set<string>();

    for (const gm of mapping.groups) {
      const groupId = gm.group.toString();
      selectedGroupIds.add(groupId);
      const attrMap = new Map<string, boolean>();
      for (const am of gm.attributes) {
        attrMap.set(am.attribute.toString(), am.isRequired);
      }
      groupAttrMap.set(groupId, attrMap);
    }

    const allSubdocs: { id: string; isRequired: boolean; groupId: string }[] =
      [];
    for (const group of set.groups || []) {
      const attrs = group.attributes || [];
      for (const item of attrs) {
        let id: string;
        let isRequired = false;
        if (typeof item === "string") {
          id = item;
        } else if (item.id) {
          id = item.id.toString();
          isRequired = item.isRequired ?? false;
        } else {
          continue;
        }
        allSubdocs.push({ id, isRequired, groupId: group._id.toString() });
      }
    }

    const allAttrIds = allSubdocs.map((s) => s.id);
    const uniqueAttrIds = [...new Set(allAttrIds)].filter((id) =>
      Types.ObjectId.isValid(id),
    );
    const attrDocs: any[] = await Attribute.find({
      _id: { $in: uniqueAttrIds },
    })
      .populate("unitFamily")
      .lean();

    const attrDocMap: Record<string, any> = {};
    for (const doc of attrDocs) {
      attrDocMap[(doc as any)._id.toString()] = doc;
    }

    const buildTree = (
      groups: any[],
      parentId: string | null = null,
      visited: Set<string> = new Set(),
    ): GroupNode[] => {
      const parentKey = parentId ?? "__ROOT__";
      if (visited.has(parentKey)) return [];
      visited.add(parentKey);

      return groups
        .filter((g) => {
          const gId = g._id.toString();
          if (!selectedGroupIds.has(gId)) return false;
          const gParent = g.parent_id?.toString();
          if (parentId === null) {
            if (!gParent) return true;
            return !selectedGroupIds.has(gParent);
          } else {
            return gParent === parentId;
          }
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((g) => {
          const groupId = g._id.toString();
          const selectedAttrMap = groupAttrMap.get(groupId) || new Map();
          const groupSubdocs = allSubdocs.filter((s) => s.groupId === groupId);
          const validSubdocs = groupSubdocs.filter((s) =>
            selectedAttrMap.has(s.id),
          );

          const attrs: MappedAttribute[] = validSubdocs
            .map((sub) => {
              const attrDoc = attrDocMap[sub.id];
              if (!attrDoc) return null;
              return {
                id: attrDoc._id.toString(),
                code: attrDoc.code,
                name: attrDoc.name,
                type: attrDoc.type,
                options: attrDoc.option || [],
                isRequired: selectedAttrMap.get(sub.id) ?? false,
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
            .filter((item): item is MappedAttribute => item !== null);

          return {
            id: groupId,
            code: g.code,
            name: g.name,
            parentId: g.parent_id?.toString() || null,
            sortOrder: g.sort_order ?? 0,
            attributes: attrs,
            children: buildTree(groups, g._id.toString(), new Set(visited)),
          };
        });
    };

    result.push({
      id: set._id.toString(),
      title: set.title,
      code: set.code,
      groups: buildTree(set.groups || [], null),
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
  return await AttributeSet.find().select("_id title code").lean();
}

// Fetch all attribute groups (flat list)
export async function getAllAttributeGroups() {
  await connection();
  return await AttributeGroup.find().select("_id name code").lean();
}

// Fetch all attributes (flat list)
export async function getAllAttributes() {
  await connection();
  return await Attribute.find().select("_id name code type").lean();
}
