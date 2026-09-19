// app/actions/category_property.ts

"use server";

import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import CategoryProperty from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import Attribute from "@/models/Attribute";
import AttributeGroup from "@/models/AttributeGroup";
import "@/models/UnitFamily";
import { revalidatePath } from "next/cache";

// ========================================================================
//  Attribute flag shape
// ========================================================================
interface AttributeFlags {
  isRequired: boolean;
  isHighlight: boolean;
}

const DEFAULT_FLAGS: AttributeFlags = {
  isRequired: false,
  isHighlight: false,
};

function toFlags(
  input: Partial<AttributeFlags> | undefined | null,
): AttributeFlags {
  return {
    isRequired: input?.isRequired === true,
    isHighlight: input?.isHighlight === true,
  };
}

function mapInputMappings(
  mappings: {
    set: string;
    groups: {
      group: string;
      attributes: {
        attribute: string;
        isRequired?: boolean;
        isHighlight?: boolean;
      }[];
    }[];
  }[],
) {
  return mappings.map((m) => ({
    set: new mongoose.Types.ObjectId(m.set),
    groups: m.groups.map((g) => ({
      group: new mongoose.Types.ObjectId(g.group),
      attributes: g.attributes.map((a) => ({
        attribute: new mongoose.Types.ObjectId(a.attribute),
        ...toFlags(a),
      })),
    })),
  }));
}

// ========================================================================
//  toPlain
// ========================================================================
function toPlain<T>(value: T): T {
  if (value === null || value === undefined) return value;

  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;
  if (t === "bigint") return String(value) as any;
  if (t === "function") return undefined as any;

  if (value instanceof Date) return value.toISOString() as any;
  if (Array.isArray(value)) return value.map((v) => toPlain(v)) as any;

  if (typeof value === "object") {
    const anyVal = value as any;

    if (
      anyVal._bsontype === "ObjectId" ||
      anyVal.constructor?.name === "ObjectId" ||
      typeof anyVal.toHexString === "function"
    ) {
      try {
        return anyVal.toString() as any;
      } catch {
        return null as any;
      }
    }

    if (typeof Buffer !== "undefined" && Buffer.isBuffer(anyVal)) {
      return anyVal.toString("hex") as any;
    }

    if (
      anyVal._bsontype &&
      typeof anyVal.toString === "function" &&
      anyVal.constructor?.name !== "Object"
    ) {
      try {
        return anyVal.toString() as any;
      } catch {
        /* fall through */
      }
    }

    if (typeof anyVal.toObject === "function") {
      return toPlain(anyVal.toObject()) as any;
    }

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(anyVal)) out[k] = toPlain(v);
    return out as any;
  }

  return value;
}

// ========================================================================
//  safeIdString
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
  if (Array.isArray(value)) return safeIdString(value[0], depth + 1, visited);
  if (typeof value === "object") {
    if (visited.has(value)) return null;
    visited.add(value);

    if (
      value instanceof mongoose.Types.ObjectId ||
      value._bsontype === "ObjectId" ||
      typeof value.toHexString === "function"
    ) {
      return value.toString();
    }

    const candidates = [value._id, value.id, value.value];
    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null) {
        const result = safeIdString(candidate, depth + 1, visited);
        if (result) return result;
      }
    }

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
    } catch {
      /* ignore */
    }
    visited.delete(value);
  }
  return null;
}

// ========================================================================
//  collectAncestorProperties
// ========================================================================
export async function collectAncestorProperties(categoryId: string): Promise<{
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
    } catch {
      /* ignore */
    }
    if (propertyId) propertyIds.push(propertyId);

    const parentId = current.parentId;
    if (!parentId) break;

    current = await Category.findById(parentId).populate("property").lean();
    depth += 1;
  }

  if (propertyIds.length === 0) return { mappings: [], propertyIds: [] };

  const properties = await CategoryProperty.find({
    _id: { $in: propertyIds },
  }).lean();

  const combinedMap = new Map<
    string,
    {
      set: string;
      groups: Map<
        string,
        { group: string; attributes: Map<string, AttributeFlags> }
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
          groupData.attributes.set(attrKey, toFlags(am as any));
        }
      }
    }
  }

  const mergedMappings = Array.from(combinedMap.values()).map((setData) => ({
    set: setData.set,
    groups: Array.from(setData.groups.values()).map((groupData) => ({
      group: groupData.group,
      attributes: Array.from(groupData.attributes.entries()).map(
        ([attr, flags]) => ({
          attribute: attr,
          isRequired: flags.isRequired,
          isHighlight: flags.isHighlight,
        }),
      ),
    })),
  }));

  return { mappings: mergedMappings, propertyIds };
}

// ========================================================================
//  ensureCategoryPropertyFromMappings
// ========================================================================
function generatePropertyCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export async function ensureCategoryPropertyFromMappings(
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

  const prepared = mapInputMappings(mappings);

  let property = await CategoryProperty.findOne({ code: baseCode });
  if (property) {
    property.name = propertyName;
    property.description = propertyDescription;
    property.mappings = prepared as any;
    await property.save();
  } else {
    property = new CategoryProperty({
      code: baseCode,
      name: propertyName,
      description: propertyDescription,
      mappings: prepared as any,
    });
    await property.save();
  }

  await Category.findByIdAndUpdate(categoryId, {
    $set: { property: property._id },
  });

  return property._id.toString();
}

// ========================================================================
//  Attribute Set / Group / Attribute Fetchers
// ========================================================================
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
  isHighlight: boolean;
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

export interface AttributeSetResult {
  id: string;
  title: string;
  code: string;
  sortOrder: number;
  groups: GroupNode[];
}

export async function buildAttributeSetsFromMappings(
  mappings: {
    set: string;
    groups: {
      group: string;
      attributes: {
        attribute: string;
        isRequired?: boolean;
        isHighlight?: boolean;
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

    const attrIds: string[] = [];
    for (const gm of mapping.groups) {
      for (const am of gm.attributes) {
        attrIds.push(am.attribute);
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
        const flags = toFlags(am as any);
        selectedAttrs.push({
          id: attrDoc._id.toString(),
          code: attrDoc.code,
          name: attrDoc.name,
          type: attrDoc.type,
          options: attrDoc.option || [],
          isRequired: flags.isRequired,
          isHighlight: flags.isHighlight,
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
          if (parentId === null) return gParent === null;
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
      sortOrder: (set as any).sortOrder ?? 0,
      groups: tree,
    });
  }

  // Sort ascending by the set's sortOrder. Sets without a value (or
  // with 0) float to the top, matching the AttributeSet schema default.
  result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return result;
}

// ========================================================================
//  Category Property CRUD
// ========================================================================
export async function getCategoryProperty(id?: string): Promise<any> {
  await connection();
  if (id) {
    const property = await CategoryProperty.findById(id).lean();
    if (!property) return null;
    return toPlain(property);
  } else {
    const properties = await CategoryProperty.find().lean();
    return toPlain(properties);
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
        isRequired?: boolean;
        isHighlight?: boolean;
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

  const prepared = mapInputMappings(mappings);
  let property = await CategoryProperty.findOne({ code });

  if (property) {
    property.name = name;
    if (description !== undefined) property.description = description;
    property.mappings = prepared as any;
    await property.save();
  } else {
    property = new CategoryProperty({
      code,
      name,
      description,
      mappings: prepared as any,
    });
    await property.save();
  }

  revalidatePath("/catalog/categories/property");
  const plain = toPlain(property.toObject());
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
          isRequired?: boolean;
          isHighlight?: boolean;
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
  if (data.mappings) property.mappings = mapInputMappings(data.mappings) as any;

  await property.save();
  revalidatePath("/catalog/categories/property");

  const plain = toPlain(property.toObject());
  return { success: true, property: plain };
}

export async function deleteCategoryProperty(id: string) {
  try {
    await connection();
    const property = await CategoryProperty.findByIdAndDelete(id);
    if (!property) return { error: "Category property not found." };

    await Category.updateMany({ property: id }, { $unset: { property: "" } });

    revalidatePath("/category-properties");
    revalidatePath("/categories");
    return { success: true, message: "Category property deleted." };
  } catch (error: any) {
    console.error("Error deleting category property:", error);
    return { error: error.message || "Failed to delete category property." };
  }
}
