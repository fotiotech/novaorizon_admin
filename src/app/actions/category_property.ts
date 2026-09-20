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
//  normalizeMappings
// ========================================================================
function normalizeMappings(mappings: any[]): any[] {
  if (!Array.isArray(mappings)) return [];
  return mappings.map((m: any) => ({
    set: m?.set?.toString?.() ?? m?.set ?? "",
    groups: Array.isArray(m?.groups)
      ? m.groups.map((g: any) => ({
          group: g?.group?.toString?.() ?? g?.group ?? "",
          attributes: Array.isArray(g?.attributes)
            ? g.attributes.map((a: any) => ({
                attribute: a?.attribute?.toString?.() ?? a?.attribute ?? "",
                isRequired: a?.isRequired === true,
                isHighlight: a?.isHighlight === true,
              }))
            : [],
        }))
      : [],
  }));
}

// ========================================================================
//  mergeMappingsWithPrecedence
//  Later layers win. [farthest, ..., nearest, own] → own wins.
// ========================================================================
function mergeMappingsWithPrecedence(layers: any[][]): any[] {
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

  for (const layer of layers) {
    if (!Array.isArray(layer)) continue;
    for (const mapping of layer) {
      const setKey = mapping?.set?.toString?.() ?? mapping?.set;
      if (!setKey) continue;

      if (!combinedMap.has(setKey)) {
        combinedMap.set(setKey, { set: setKey, groups: new Map() });
      }
      const setData = combinedMap.get(setKey)!;

      for (const gm of mapping?.groups ?? []) {
        const groupKey = gm?.group?.toString?.() ?? gm?.group;
        if (!groupKey) continue;

        if (!setData.groups.has(groupKey)) {
          setData.groups.set(groupKey, {
            group: groupKey,
            attributes: new Map(),
          });
        }
        const groupData = setData.groups.get(groupKey)!;

        for (const am of gm?.attributes ?? []) {
          const attrKey = am?.attribute?.toString?.() ?? am?.attribute;
          if (!attrKey) continue;
          groupData.attributes.set(attrKey, toFlags(am));
        }
      }
    }
  }

  return Array.from(combinedMap.values()).map((setData) => ({
    set: setData.set,
    groups: Array.from(setData.groups.values()).map((groupData) => ({
      group: groupData.group,
      attributes: Array.from(groupData.attributes.entries()).map(
        ([attribute, flags]) => ({
          attribute,
          isRequired: flags.isRequired,
          isHighlight: flags.isHighlight,
        }),
      ),
    })),
  }));
}

// ========================================================================
//  collectAncestorProperties
//
//  Walks the PARENT chain. Uses each tier's `property` (own) — not
//  their `inheritedProperty` — so every tier contributes its own
//  attributes directly. Self is excluded; caller adds own via merge.
// ========================================================================
export async function collectAncestorProperties(categoryId: string): Promise<{
  mappings: any[];
  propertyIds: string[];
}> {
  await connection();
  const propertyIds: string[] = [];
  const visited = new Set<string>();
  let depth = 0;

  const start: any = await Category.findById(categoryId)
    .select("parentId")
    .lean();

  let currentId: string | null = start?.parentId?.toString() || null;

  while (currentId && depth < 20 && !visited.has(currentId)) {
    visited.add(currentId);
    const node: any = await Category.findById(currentId)
      .populate("property")
      .lean();
    if (!node) break;

    const propertyId = safeIdString(node.property);
    if (propertyId) propertyIds.push(propertyId);

    currentId = node.parentId?.toString() || null;
    depth += 1;
  }

  if (propertyIds.length === 0) return { mappings: [], propertyIds: [] };

  const properties = await CategoryProperty.find({
    _id: { $in: propertyIds },
  }).lean();

  const orderIndex = new Map(propertyIds.map((id, i) => [id, i]));
  properties.sort((a: any, b: any) => {
    const ai = orderIndex.get(a._id.toString()) ?? -1;
    const bi = orderIndex.get(b._id.toString()) ?? -1;
    return bi - ai;
  });

  const layers = properties.map((p: any) =>
    normalizeMappings(p.mappings ?? []),
  );

  return {
    mappings: mergeMappingsWithPrecedence(layers),
    propertyIds,
  };
}

// ========================================================================
//  Inherited-property code generation
// ========================================================================
function generatePropertyCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function generateInheritedPropertyCode(
  name: string,
  categoryId: string,
): string {
  const base = generatePropertyCode(name) || "category";
  return `${base}_inherited_${categoryId.slice(-8)}`;
}

// ========================================================================
//  ensureCategoryPropertyFromMappings
//
//  Upserts the auto-generated CategoryProperty (readOnly: true) and
//  repoints `category.inheritedProperty` at it. Cleans up any previous
//  snapshot (e.g. stale doc from a rename) in the same call.
// ========================================================================
export async function ensureCategoryPropertyFromMappings(
  categoryId: string,
  mappings: any[],
): Promise<string | null> {
  const category = await Category.findById(categoryId).select(
    "name inheritedProperty",
  );
  if (!category) return null;

  if (mappings.length === 0) {
    // No snapshot needed — clean up any previous one.
    if (category.inheritedProperty) {
      await CategoryProperty.deleteOne({ _id: category.inheritedProperty });
    }
    await Category.findByIdAndUpdate(categoryId, {
      $set: { inheritedProperty: null },
    });
    return null;
  }

  const code = generateInheritedPropertyCode(category.name, categoryId);
  const propertyName = category.name;
  const propertyDescription = `Auto-generated inherited property for ${category.name}`;

  const prepared = mapInputMappings(mappings);

  let property = await CategoryProperty.findOne({ code });
  if (property) {
    property.name = propertyName;
    property.description = propertyDescription;
    property.readOnly = true;
    property.mappings = prepared as any;
    await property.save();
  } else {
    property = new CategoryProperty({
      code,
      name: propertyName,
      description: propertyDescription,
      readOnly: true,
      mappings: prepared as any,
    });
    await property.save();
  }

  // If the category previously pointed at a different snapshot (e.g.
  // from a prior name), delete that stale doc.
  const previousId = category.inheritedProperty?.toString();
  if (previousId && previousId !== property._id.toString()) {
    await CategoryProperty.deleteOne({ _id: previousId });
  }

  await Category.findByIdAndUpdate(categoryId, {
    $set: { inheritedProperty: property._id },
  });

  return property._id.toString();
}

// ========================================================================
//  applyInheritedPropertyToCategory
//
//  Merges own `property` + ancestors (own wins), then writes the
//  snapshot via ensureCategoryPropertyFromMappings. `property` is
//  untouched.
// ========================================================================
export async function applyInheritedPropertyToCategory(
  categoryId: string,
): Promise<{ propertyId: string | null; warning?: string }> {
  await connection();

  const category: any = await Category.findById(categoryId)
    .select("property")
    .lean();
  if (!category) {
    return { propertyId: null, warning: "Category not found." };
  }

  let ownMappings: any[] = [];
  if (category.property) {
    const ownProp: any = await CategoryProperty.findById(
      category.property,
    ).lean();
    if (ownProp?.mappings) {
      ownMappings = normalizeMappings(ownProp.mappings);
    }
  }

  const { mappings: ancestorMappings } =
    await collectAncestorProperties(categoryId);

  const merged = mergeMappingsWithPrecedence([ancestorMappings, ownMappings]);

  if (merged.length === 0) {
    await ensureCategoryPropertyFromMappings(categoryId, []);
    return {
      propertyId: null,
      warning: "No properties to inherit or merge.",
    };
  }

  const propertyId = await ensureCategoryPropertyFromMappings(
    categoryId,
    merged,
  );

  return { propertyId };
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

  result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return result;
}

// ========================================================================
//  Category Property CRUD
// ========================================================================

// By default hides readOnly (auto-generated) docs from the admin list.
export async function getCategoryProperty(
  id?: string,
  options?: { includeReadOnly?: boolean },
): Promise<any> {
  await connection();
  if (id) {
    const property = await CategoryProperty.findById(id).lean();
    if (!property) return null;
    return toPlain(property);
  }

  const filter = options?.includeReadOnly ? {} : { readOnly: { $ne: true } };
  const properties = await CategoryProperty.find(filter).lean();
  return toPlain(properties);
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

  const duplicate = await CategoryProperty.findOne({ code });
  if (duplicate) {
    return { error: `Code "${code}" is already in use.` };
  }

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

  const property = new CategoryProperty({
    code,
    name,
    description,
    readOnly: false,
    mappings: prepared as any,
  });
  await property.save();

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

  if (property.readOnly) {
    return {
      error:
        "This property is system-managed (inherited). It can only be regenerated via Re-run inheritance.",
    };
  }

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
    const property = await CategoryProperty.findById(id);
    if (!property) return { error: "Category property not found." };

    if (property.readOnly) {
      return {
        error:
          "This property is system-managed (inherited) and cannot be deleted manually.",
      };
    }

    await CategoryProperty.findByIdAndDelete(id);

    // Only the manual ref needs clearing. Inherited refs point at
    // auto-gen docs that are cleaned up when their category changes
    // or is deleted.
    await Category.updateMany({ property: id }, { $unset: { property: "" } });

    revalidatePath("/catalog/categories/property");
    revalidatePath("/categories");
    return { success: true, message: "Category property deleted." };
  } catch (error: any) {
    console.error("Error deleting category property:", error);
    return { error: error.message || "Failed to delete category property." };
  }
}
