"use server";

import mongoose, { Types } from "mongoose"; // ✅ single import
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

export async function createCategoryPropertyWithMappings(data: {
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
  const { name, description, mappings } = data;

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

  const property = new CategoryProperty({
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
  revalidatePath("/category-properties");
  return { success: true, property };
}

export async function updateCategoryPropertyWithMappings(
  id: string,
  data: {
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

  if (data.name) property.name = data.name;
  if (data.description !== undefined) property.description = data.description;
  if (data.mappings) {
    // Replace mappings entirely
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
  revalidatePath("/category-properties");
  return { success: true, property };
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

// ---------- Category CRUD (unchanged) ----------
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

export async function createCategory(
  formData: {
    _id?: string;
    name?: string;
    parent_id?: string;
    description?: string;
    imageUrl?: string[];
    propertyId?: string;
  },
  id?: string | null,
) {
  try {
    const { name, parent_id, description, imageUrl, propertyId } = formData;
    const url_slug = generateSlug(name + (description || ""));
    await connection();
    const existingCategory = id ? await Category.findById(id) : null;
    if (propertyId) {
      const propertyExists = await CategoryProperty.findById(propertyId);
      if (!propertyExists) {
        return { error: "Invalid propertyId: CategoryProperty not found." };
      }
    }
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
    } else {
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

// ---------- Standardized Attribute Set Fetcher ----------

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

export async function getCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSetResult[]> {
  await connection();

  const category: any = await Category.findById(categoryId)
    .populate<{ property: ICategoryProperty }>("property")
    .lean();

  if (!category?.property) return [];
  const property = category.property;

  // ----- Use mappings if present -----
  if (property.mappings && property.mappings.length > 0) {
    const result: AttributeSetResult[] = [];

    for (const mapping of property.mappings) {
      // Fetch the full AttributeSet with its groups
      const set = await AttributeSet.findById(mapping.set)
        .populate<{ groups: any[] }>("groups")
        .lean();
      if (!set) continue;

      // ---- 1. Build a map: groupId -> Map<attributeId, isRequired> ----
      const groupAttrMap = new Map<string, Map<string, boolean>>();
      for (const gm of mapping.groups) {
        const attrMap = new Map<string, boolean>();
        for (const am of gm.attributes) {
          attrMap.set(am.attribute.toString(), am.isRequired);
        }
        groupAttrMap.set(gm.group.toString(), attrMap);
      }

      // ---- 2. Collect all attribute subdocuments from this set ----
      // Normalize: group.attributes may be array of ObjectIds or subdocs { id, isRequired }
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

      // ---- 3. Fetch all attributes (with unitFamily) for this set ----
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

      // ---- 4. Build the group tree ----
      const buildTree = (
        groups: any[],
        parentId: string | null = null,
      ): GroupNode[] => {
        const groupIds = new Set(groups.map((g) => g._id.toString()));
        return groups
          .filter((g) => {
            const gParent = g.parent_id?.toString();
            return parentId === null
              ? !gParent || !groupIds.has(gParent)
              : gParent === parentId;
          })
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((g) => {
            const groupId = g._id.toString();
            // Get the selected attribute map for this group (from the property mapping)
            const selectedAttrMap = groupAttrMap.get(groupId) || new Map();

            // Get all subdocs for this group, then filter to only those in selectedAttrMap
            const groupSubdocs = allSubdocs.filter(
              (s) => s.groupId === groupId,
            );
            const validSubdocs = groupSubdocs.filter((s) =>
              selectedAttrMap.has(s.id),
            );

            // Build attributes from valid subdocs and the fetched attr docs
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
              children: buildTree(groups, g._id.toString()),
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

  // ---- FALLBACK: old 'sets' array ----
  const oldSets = (property as any).sets;
  if (oldSets && Array.isArray(oldSets) && oldSets.length > 0) {
    const setIds = oldSets.map((s: any) => s._id?.toString() || s.toString());
    const attributeSets = await AttributeSet.find({ _id: { $in: setIds } })
      .populate<{ groups: any[] }>("groups")
      .lean();

    // Build full tree (include all groups and attributes)
    const buildTreeFull = (
      groups: any[],
      parentId: string | null = null,
    ): GroupNode[] => {
      const groupIds = new Set(groups.map((g) => g._id.toString()));
      return groups
        .filter((g) => {
          const gParent = g.parent_id?.toString();
          return parentId === null
            ? !gParent || !groupIds.has(gParent)
            : gParent === parentId;
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((g) => {
          // Normalize attributes: plain ObjectId or subdoc
          const attrs: MappedAttribute[] = (g.attributes || [])
            .map((item: any) => {
              let attrDoc = item.id ? item.id : item;
              if (typeof attrDoc === "string") {
                // If it's a plain ID, we didn't populate – fallback to fetching?
                // But we already populated, so this shouldn't happen.
                return null;
              }
              if (!attrDoc) return null;
              return {
                id: attrDoc._id.toString(),
                code: attrDoc.code,
                name: attrDoc.name,
                type: attrDoc.type,
                options: attrDoc.option || [],
                isRequired: item.isRequired ?? false,
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
            .filter((item: any): item is MappedAttribute => item !== null);

          return {
            id: g._id.toString(),
            code: g.code,
            name: g.name,
            parentId: g.parent_id?.toString() || null,
            sortOrder: g.sort_order ?? 0,
            attributes: attrs,
            children: buildTreeFull(groups, g._id.toString()),
          };
        });
    };

    return attributeSets.map((set) => ({
      id: set._id.toString(),
      title: set.title,
      code: set.code,
      groups: buildTreeFull(set.groups || [], null),
    }));
  }

  return [];
}

export async function getAllAttributeSets() {
  await connection();
  return await AttributeSet.find().select("_id title code").lean();
}

export async function getGroupsBySet(setId: string) {
  await connection();
  const set = await AttributeSet.findById(setId).populate("groups").lean();
  return set?.groups || [];
}

export async function getAttributesByGroup(groupId: string) {
  await connection();
  const group: any = await AttributeGroup.findById(groupId)
    .populate("attributes.id")
    .lean();
  if (!group) return [];
  return (group.attributes || []).map((sub: any) => ({
    _id: sub.id._id.toString(),
    code: sub.id.code,
    name: sub.id.name,
    type: sub.id.type,
    isRequired: sub.isRequired,
  }));
}
