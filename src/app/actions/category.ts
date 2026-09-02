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

// ---------- Helper: Slug ----------
function generateSlug(name: string) {
  return slugify(name, { lower: true });
}

async function getUniqueCategorySlug(
  name: string,
  parentId?: string | null,
  excludeId?: string | null,
): Promise<string> {
  const normalizedName = (name || "").trim();
  if (!normalizedName) {
    return "category";
  }

  let base = generateSlug(normalizedName);
  if (parentId) {
    const parent = await Category.findById(parentId).select("slug name");
    if (parent) {
      const parentSlug =
        parent.slug || parent.url_slug || generateSlug(parent.name || "");
      base = `${parentSlug}>${generateSlug(normalizedName)}`;
    }
  }

  let candidate = base;
  let suffix = 2;

  while (
    await Category.exists({
      slug: candidate,
      _id: { $ne: excludeId || undefined },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

// ========================================================================
//  SAFE safeIdString – cycle-aware, never throws
// ========================================================================
function safeIdString(
  value: any,
  depth = 0,
  visited = new WeakSet(),
): string | null {
  if (depth > 10) return null;
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" || typeof value === "number") {
    const str = String(value);
    return mongoose.Types.ObjectId.isValid(str) ? str : null;
  }
  if (Array.isArray(value)) {
    return safeIdString(value[0], depth + 1, visited);
  }
  if (typeof value === "object") {
    if (visited.has(value)) return null;
    visited.add(value);

    // Mongoose ObjectId or similar
    if (
      value instanceof mongoose.Types.ObjectId ||
      value._bsontype === "ObjectId" ||
      typeof value.toHexString === "function"
    ) {
      return value.toString();
    }

    // Try common ID keys
    const candidates = [value._id, value.id, value.value];
    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null) {
        const result = safeIdString(candidate, depth + 1, visited);
        if (result) return result;
      }
    }

    // Fallback: if the object itself has a valid toString
    try {
      if (typeof value.toString === "function") {
        const str = value.toString();
        if (
          str &&
          str !== "[object Object]" &&
          mongoose.Types.ObjectId.isValid(str)
        ) {
          return str;
        }
      }
    } catch (e) {
      // ignore
    }
    visited.delete(value);
  }
  return null;
}

export async function getCategories() {
  await connection();
  const categories = await Category.find().populate("property").lean();
  return categories;
}

// ---------- Helper: Compute full slug for a category (recursive) ----------
async function getFullSlugForCategory(categoryId: string): Promise<string> {
  const category =
    await Category.findById(categoryId).select("slug parentId name");
  if (!category) return "";

  const canonicalSlug = category.slug || category.url_slug;
  if (canonicalSlug) return canonicalSlug;

  if (!category.parentId) {
    return generateSlug(category.name);
  }

  const parentSlug = await getFullSlugForCategory(category.parentId.toString());
  return parentSlug + ">" + generateSlug(category.name);
}

// ---------- Category Property CRUD ----------
export async function getCategoryProperty(id?: string): Promise<any> {
  await connection();
  if (id) {
    const property = await CategoryProperty.findById(id).lean();
    if (!property) return null;
    return property;
  } else {
    const properties = await CategoryProperty.find().lean();
    return properties;
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
  return { success: true, property: plain };
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
  return { success: true, property: plain };
}

export async function deleteCategoryProperty(id: string) {
  try {
    await connection();
    const property = await CategoryProperty.findByIdAndDelete(id);
    if (!property) return { error: "Category property not found." };

    await Category.updateMany({ property: id }, { $unset: { property: "" } });
    await Category.updateMany(
      { inheritProperty: true },
      { $set: { inheritProperty: false } },
    );

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
): Promise<any> {
  await connection();
  if (name) {
    const category = await Category.findOne({ name });
    if (category) {
      const subCategories = await Category.find({ parentId: category._id });
      return subCategories;
    }
    return [];
  } else if (id) {
    const category = await Category.findById(id).populate("property").lean();
    if (!category) return null;
    return category;
  } else if (parentId) {
    const subCategories = await Category.find({ parentId })
      .populate("property")
      .lean();
    return subCategories;
  } else {
    const categories = await Category.find().populate("property").lean();
    return categories;
  }
}

// ========================================================================
//  COLLECT ANCESTOR PROPERTIES – now supports both parentId and parent_id
// ========================================================================
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
  const visited = new Set<string>();

  while (current && depth < 20 && !visited.has(current._id?.toString())) {
    visited.add(current._id.toString());

    let propertyId: string | null = null;
    try {
      if (current.property) {
        if (typeof current.property === "object" && current.property !== null) {
          const propObj = current.property;
          const idVal = propObj._id ?? propObj.id ?? propObj;
          propertyId = safeIdString(idVal);
        } else {
          propertyId = safeIdString(current.property);
        }
      }
    } catch (e) {
      // ignore
    }
    if (propertyId) {
      propertyIds.push(propertyId);
    }

    // ✅ Support both parentId and parent_id
    const parentId = current.parentId ?? current.parent_id;
    if (!parentId) break;

    current = await Category.findById(parentId).populate("property").lean();
    depth += 1;
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
    if (!prop.mappings || !Array.isArray(prop.mappings)) continue;
    for (const mapping of prop.mappings) {
      if (!mapping.set) continue;
      const setKey = mapping.set.toString();
      if (!combinedMap.has(setKey)) {
        combinedMap.set(setKey, { set: setKey, groups: new Map() });
      }
      const setData = combinedMap.get(setKey)!;
      if (!mapping.groups) continue;
      for (const gm of mapping.groups) {
        if (!gm.group) continue;
        const groupKey = gm.group.toString();
        if (!setData.groups.has(groupKey)) {
          setData.groups.set(groupKey, {
            group: groupKey,
            attributes: new Map(),
          });
        }
        const groupData = setData.groups.get(groupKey)!;
        if (!gm.attributes) continue;
        for (const am of gm.attributes) {
          if (!am.attribute) continue;
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

// ---------- Helper: Ensure category property from mappings ----------
async function ensureCategoryPropertyFromMappings(
  categoryId: string,
  mappings: any[],
): Promise<string | null> {
  const category = await Category.findById(categoryId).select("name");
  if (!category) return null;

  if (mappings.length === 0) {
    await Category.findByIdAndUpdate(categoryId, { $set: { property: null } });
    return null;
  }

  const baseCode = generatePropertyCode(category.name) + "_inherited";
  const propertyName = `${category.name} (Inherited)`;
  const propertyDescription = `Auto-generated inherited property for ${category.name}`;

  let property = await CategoryProperty.findOne({ code: baseCode });

  if (property) {
    property.name = propertyName;
    property.description = propertyDescription;
    property.mappings = mappings.map((m) => ({
      set: new mongoose.Types.ObjectId(m.set),
      groups: m.groups.map((g: any) => ({
        group: new mongoose.Types.ObjectId(g.group),
        attributes: g.attributes.map((a: any) => ({
          attribute: new mongoose.Types.ObjectId(a.attribute),
          isRequired: a.isRequired,
        })),
      })),
    }));
    await property.save();
  } else {
    property = new CategoryProperty({
      code: baseCode,
      name: propertyName,
      description: propertyDescription,
      mappings: mappings.map((m) => ({
        set: new mongoose.Types.ObjectId(m.set),
        groups: m.groups.map((g: any) => ({
          group: new mongoose.Types.ObjectId(g.group),
          attributes: g.attributes.map((a: any) => ({
            attribute: new mongoose.Types.ObjectId(a.attribute),
            isRequired: a.isRequired,
          })),
        })),
      })),
    });
    await property.save();
  }

  await Category.findByIdAndUpdate(categoryId, {
    $set: { property: property._id },
  });

  return property._id.toString();
}

// ========================================================================
//  createCategory – with all fixes, no reliance on serialize recursion
// ========================================================================
export async function createCategory(
  formData: {
    _id?: string;
    name?: string;
    parent_id?: string;
    parentId?: string;
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
      parentId,
      description,
      imageUrl,
      propertyId,
      inheritProperty,
    } = formData;
    await connection();

    const resolvedParentId = parentId || parent_id || null;
    if (!name || !name.trim()) {
      return { error: "Category name is required." };
    }

    if (id && resolvedParentId && id === resolvedParentId) {
      return { error: "A category cannot be its own parent." };
    }

    if (resolvedParentId && id) {
      let currentParentId: string | null = resolvedParentId;
      const seen = new Set<string>();
      while (currentParentId && !seen.has(currentParentId)) {
        seen.add(currentParentId);
        const parentCategory: any =
          await Category.findById(currentParentId).select("parentId");
        if (!parentCategory) break;
        if (parentCategory.parentId?.toString() === id) {
          return {
            error: "A category cannot be assigned to one of its descendants.",
          };
        }
        currentParentId = parentCategory.parentId?.toString() || null;
      }
    }

    const slugValue = await getUniqueCategorySlug(
      name,
      resolvedParentId,
      id || undefined,
    );

    let categoryId: string | null = null;
    const existingCategory = id ? await Category.findById(id) : null;

    if (existingCategory) {
      const updateData: any = {
        name,
        parentId: resolvedParentId,
        parent_id: resolvedParentId,
        slug: slugValue,
        url_slug: slugValue,
        description,
        imageUrl: imageUrl || [],
      };

      if (inheritProperty === true) {
        updateData.inheritProperty = true;
      } else {
        updateData.inheritProperty = false;
        if (propertyId) {
          updateData.property = propertyId;
        } else {
          updateData.property = null;
        }
      }

      await Category.findOneAndUpdate(
        { _id: existingCategory._id },
        { $set: updateData },
      );
      categoryId = existingCategory._id.toString();
    } else {
      const newCategoryData: any = {
        slug: slugValue,
        url_slug: slugValue,
        name,
        parentId: resolvedParentId,
        parent_id: resolvedParentId,
        description,
        imageUrl: imageUrl || [],
        inheritProperty: inheritProperty ?? false,
      };

      if (inheritProperty === true) {
        newCategoryData.property = null;
      } else {
        newCategoryData.property = propertyId || null;
      }

      const newCategory = new Category(newCategoryData);
      const saved = await newCategory.save();
      categoryId = saved._id.toString();
    }

    if (inheritProperty && categoryId) {
      const { mappings } = await collectAncestorProperties(categoryId);

      if (mappings.length === 0) {
        await Category.findByIdAndUpdate(categoryId, {
          $set: { property: null },
        });
        return {
          success: true,
          warning: "No ancestor properties found to inherit.",
        };
      }

      const baseCode = generatePropertyCode(name || "");
      const propertyName = `${name || "Category"} (Inherited)`;
      const propertyDescription = `Auto-generated from ancestors`;

      let property = await CategoryProperty.findOne({ code: baseCode });

      if (property) {
        property.name = propertyName;
        property.description = propertyDescription;
        property.mappings = mappings.map((m) => ({
          set: new mongoose.Types.ObjectId(m.set),
          groups: m.groups.map((g: any) => ({
            group: new mongoose.Types.ObjectId(g.group),
            attributes: g.attributes.map((a: any) => ({
              attribute: new mongoose.Types.ObjectId(a.attribute),
              isRequired: a.isRequired,
            })),
          })),
        }));
        await property.save();
      } else {
        property = new CategoryProperty({
          code: baseCode,
          name: propertyName,
          description: propertyDescription,
          mappings: mappings.map((m) => ({
            set: new mongoose.Types.ObjectId(m.set),
            groups: m.groups.map((g: any) => ({
              group: new mongoose.Types.ObjectId(g.group),
              attributes: g.attributes.map((a: any) => ({
                attribute: new mongoose.Types.ObjectId(a.attribute),
                isRequired: a.isRequired,
              })),
            })),
          })),
        });
        await property.save();
      }

      await Category.findByIdAndUpdate(categoryId, {
        $set: { property: property._id },
      });

      revalidatePath("/categories");
      revalidatePath("/category-properties");
    }

    revalidatePath("/categories");
    return { success: true };
  } catch (error: any) {
    console.error(
      "Error processing category request:",
      error?.message,
      error?.stack,
    );
    return {
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

// ========================================================================
//  deleteCategory – removed invalid $pull
// ========================================================================
export async function deleteCategory(id: string) {
  try {
    await connection();

    await Category.updateMany({ parentId: id }, { $set: { parentId: null } });
    await Category.updateMany({ property: id }, { $unset: { property: "" } });

    await mongoose.models.Product?.updateMany(
      { categoryId: id },
      { $unset: { categoryId: "" } },
    );

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
    const set = await AttributeSet.findById(mapping.set).lean();
    if (!set) continue;

    const groupIds = mapping.groups.map((g) => g.group);
    if (groupIds.length === 0) continue;

    const groups = await AttributeGroup.find({
      _id: { $in: groupIds },
    }).lean();

    const groupMap: Record<string, any> = {};
    for (const g of groups) {
      groupMap[(g._id ?? "").toString()] = g;
    }

    const attrIds: string[] = [];
    const attrRequiredMap: Record<string, boolean> = {};
    for (const gm of mapping.groups) {
      for (const am of gm.attributes) {
        attrIds.push(am.attribute);
        attrRequiredMap[am.attribute] = am.isRequired;
      }
    }

    const attributes = await Attribute.find({
      _id: { $in: attrIds },
    })
      .populate("unitFamily")
      .lean();

    const attrMap: Record<string, any> = {};
    for (const a of attributes) {
      attrMap[(a._id ?? "").toString()] = a;
    }

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

    const buildTree = (
      parentId: string | null = null,
      visited: Set<string> = new Set(),
    ): GroupNode[] => {
      const parentKey = parentId ?? "__ROOT__";
      if (visited.has(parentKey)) return [];
      visited.add(parentKey);

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

// ========================================================================
//  getCategoryAttributeSets – with debug logs and parent_id support
// ========================================================================
export async function getCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSetResult[]> {
  await connection();

  console.log("[getCategoryAttributeSets] Called with categoryId:", categoryId);

  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    console.warn("[getCategoryAttributeSets] Invalid categoryId:", categoryId);
    return [];
  }

  const category: any = await Category.findById(categoryId)
    .select("inheritProperty property")
    .lean();
  if (!category) {
    console.warn(
      "[getCategoryAttributeSets] Category not found for ID:",
      categoryId,
    );
    return [];
  }

  console.log("[getCategoryAttributeSets] Category found:", {
    id: category._id,
    inheritProperty: category.inheritProperty,
    property: category.property,
  });

  if (category.inheritProperty === true) {
    console.log(
      "[getCategoryAttributeSets] Inheritance enabled – collecting ancestors",
    );
    const { mappings, propertyIds } =
      await collectAncestorProperties(categoryId);
    console.log(
      "[getCategoryAttributeSets] Ancestor mappings count:",
      mappings.length,
    );
    console.log(
      "[getCategoryAttributeSets] Ancestor property IDs:",
      propertyIds,
    );

    if (mappings.length === 0) {
      console.warn(
        "[getCategoryAttributeSets] No ancestor mappings – clearing property",
      );
      await Category.findByIdAndUpdate(categoryId, {
        $set: { property: null },
      });
      return [];
    }

    const propId = await ensureCategoryPropertyFromMappings(
      categoryId,
      mappings,
    );
    if (!propId) {
      console.error(
        "[getCategoryAttributeSets] Failed to ensure category property",
      );
      return [];
    }

    const property: any = await CategoryProperty.findById(propId).lean();
    if (!property) {
      console.error(
        "[getCategoryAttributeSets] Property not found after ensure:",
        propId,
      );
      return [];
    }

    console.log(
      "[getCategoryAttributeSets] Final property mappings:",
      JSON.stringify(property.mappings, null, 2),
    );
    return buildAttributeSetsFromMappings(property.mappings);
  } else {
    console.log(
      "[getCategoryAttributeSets] Inheritance disabled – using own property",
    );
    if (!category.property) {
      console.warn(
        "[getCategoryAttributeSets] No property linked and inheritance disabled",
      );
      return [];
    }
    const property: any = await CategoryProperty.findById(
      category.property,
    ).lean();
    if (!property) {
      console.error(
        "[getCategoryAttributeSets] Category property not found:",
        category.property,
      );
      return [];
    }
    console.log(
      "[getCategoryAttributeSets] Direct property mappings:",
      JSON.stringify(property.mappings, null, 2),
    );
    return buildAttributeSetsFromMappings(property.mappings);
  }
}

export async function getAllAttributeSets() {
  await connection();
  const sets = await AttributeSet.find().select("_id title code").lean();
  return sets;
}

export async function getAllAttributeGroups() {
  await connection();
  const groups = await AttributeGroup.find().select("_id name code").lean();
  return groups;
}

export async function getAllAttributes() {
  await connection();
  const attrs = await Attribute.find().select("_id name code type").lean();
  return attrs;
}

export async function deleteCategoryImage(
  categoryId: string,
  imageUrl: string,
) {
  try {
    await connection();

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return { success: false, error: "Invalid category ID" };
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return { success: false, error: "Category not found" };
    }

    if (!category.imageUrl?.includes(imageUrl)) {
      return { success: false, error: "Image not found in category" };
    }

    await deleteS3Object(imageUrl);

    category.imageUrl = category.imageUrl.filter(
      (url: string) => url !== imageUrl,
    );
    await category.save();

    revalidatePath("/categories");

    return { success: true, data: category.imageUrl };
  } catch (error) {
    console.error("Error deleting category image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}
