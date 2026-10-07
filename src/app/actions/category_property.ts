// app/actions/category_property.ts

"use server";

import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import Category from "@/models/Category";
import CategoryProperty from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import Attribute from "@/models/Attribute";
import AttributeGroup from "@/models/AttributeGroup";
import UnitFamily from "@/models/UnitFamily";
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
//  coerceToObjectId
//
//  Some Attribute docs have a corrupted `unitFamily` ref — the raw 12
//  bytes of an ObjectId serialized as `{0:..,1:..}`. Mongoose's
//  `populate` throws on it and kills the whole query. We detect and
//  reject that here so a single bad row can't take down the page.
// ========================================================================
function coerceToObjectId(value: any): mongoose.Types.ObjectId | null {
  if (!value) return null;

  if (value instanceof mongoose.Types.ObjectId) return value;

  if (value._bsontype === "ObjectId" && typeof value.toString === "function") {
    try {
      const str = value.toString();
      return mongoose.Types.ObjectId.isValid(str)
        ? new mongoose.Types.ObjectId(str)
        : null;
    } catch {
      return null;
    }
  }

  if (typeof value === "string") {
    return mongoose.Types.ObjectId.isValid(value)
      ? new mongoose.Types.ObjectId(value)
      : null;
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
//  Full re-merge. Used by the manual "Re-run inheritance" button and by
//  the re-parent cascade (see rerunInheritanceForCategoryAndDescendants).
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
//  rerunInheritanceForCategoryAndDescendants
//
//  Full re-merge cascade, but only over a bounded subtree with a simple
//  recursive walk. Used for re-parenting, where the descendant's
//  ancestor chain itself changed, so the snapshot must be *rebuilt*
//  (adds + removes), not just pruned.
//
//  Not called on property updates — see pruneDescendantsAfterPropertyUpdate.
// ========================================================================
export async function rerunInheritanceForCategoryAndDescendants(
  categoryId: string,
): Promise<void> {
  await connection();

  if (!mongoose.Types.ObjectId.isValid(categoryId)) return;

  const visited = new Set<string>();

  async function walk(nodeId: string): Promise<void> {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node: any = await Category.findById(nodeId)
      .select("inheritProperty parentId")
      .lean();
    if (!node) return;

    if (node.inheritProperty === true && node.parentId) {
      try {
        await applyInheritedPropertyToCategory(nodeId);
      } catch (err) {
        console.error(
          `[inheritance] Failed to re-run for category ${nodeId}:`,
          err,
        );
      }
    }

    const children: any[] = await Category.find({ parentId: nodeId })
      .select("_id")
      .lean();

    for (const child of children) {
      await walk(child._id.toString());
    }
  }

  await walk(categoryId);
}

// ========================================================================
//  Prune helpers
//
//  The "prune" path is the counterpart to re-merge: when a property's
//  *own* mappings lose attributes, every inheriting descendant's
//  snapshot may still hold those attributes even though neither the
//  descendant's own property nor any ancestor contributes them anymore.
//  We don't rebuild — we just walk the subtree, compute the set of
//  attribute IDs that are actually reachable from (ancestor-chain own
//  properties) ∪ (this node's own property), and drop everything else
//  from the existing snapshot.
// ========================================================================

function collectAttrIdsFromMappings(mappings: any[]): Set<string> {
  const out = new Set<string>();
  for (const m of mappings ?? []) {
    for (const g of m.groups ?? []) {
      for (const a of g.attributes ?? []) {
        const id = a?.attribute?.toString?.();
        if (id) out.add(id);
      }
    }
  }
  return out;
}

async function collectAttrIdsFromPropertyId(
  propertyId: string | null,
): Promise<Set<string>> {
  if (!propertyId) return new Set();
  const prop: any = await CategoryProperty.findById(propertyId)
    .select("mappings")
    .lean();
  return collectAttrIdsFromMappings(prop?.mappings ?? []);
}

async function collectAncestorAttrIds(
  categoryId: string,
): Promise<Set<string>> {
  const out = new Set<string>();
  const visited = new Set<string>();

  const self: any = await Category.findById(categoryId)
    .select("parentId")
    .lean();
  if (!self?.parentId) return out;

  let currentId: string | null = self.parentId.toString();
  let depth = 0;

  while (currentId && depth < 30 && !visited.has(currentId)) {
    visited.add(currentId);
    depth += 1;

    const node: any = await Category.findById(currentId)
      .select("property parentId")
      .lean();
    if (!node) break;

    const own = await collectAttrIdsFromPropertyId(
      node.property?.toString() ?? null,
    );
    for (const a of own) out.add(a);

    currentId = node.parentId?.toString() ?? null;
  }

  return out;
}

/**
 * Recursively walks the subtree under `categoryId` and prunes each
 * inheriting node's snapshot to only attributes reachable from:
 *   parentEffective (computed top-down) ∪ this node's own property.
 *
 * `parentEffective` is the accumulated "allowed" set passed down from
 * the parent. The returned number is how many snapshots were changed.
 */
async function pruneSubtree(
  categoryId: string,
  parentEffective: Set<string>,
  visited: Set<string>,
): Promise<number> {
  if (visited.has(categoryId)) return 0;
  visited.add(categoryId);

  const category: any = await Category.findById(categoryId)
    .select("property inheritedProperty inheritProperty parentId")
    .lean();
  if (!category) return 0;

  const ownAttrs = await collectAttrIdsFromPropertyId(
    category.property?.toString() ?? null,
  );

  const allowed = new Set<string>(parentEffective);
  for (const a of ownAttrs) allowed.add(a);

  let updated = 0;

  // ---- Prune this node's snapshot if it inherits. ----
  if (
    category.inheritProperty === true &&
    category.inheritedProperty &&
    category.parentId
  ) {
    const snapshotId = category.inheritedProperty.toString();
    const snapshot: any = await CategoryProperty.findById(snapshotId)
      .select("mappings")
      .lean();

    if (snapshot?.mappings) {
      let removedAny = false;
      const newMappings: any[] = [];

      for (const m of snapshot.mappings ?? []) {
        const newGroups: any[] = [];

        for (const g of m.groups ?? []) {
          const originalAttrs = g.attributes ?? [];
          const keptAttrs = originalAttrs.filter((a: any) => {
            const id = a?.attribute?.toString?.();
            return id && allowed.has(id);
          });

          if (keptAttrs.length !== originalAttrs.length) removedAny = true;
          if (keptAttrs.length > 0) {
            newGroups.push({ group: g.group, attributes: keptAttrs });
          }
        }

        if (newGroups.length !== (m.groups ?? []).length) removedAny = true;
        if (newGroups.length > 0) {
          newMappings.push({ set: m.set, groups: newGroups });
        }
      }

      if (removedAny) {
        if (newMappings.length === 0) {
          // Snapshot is now empty — remove it and clear the ref.
          await CategoryProperty.deleteOne({ _id: snapshotId });
          await Category.findByIdAndUpdate(categoryId, {
            $set: { inheritedProperty: null },
          });
        } else {
          await CategoryProperty.findByIdAndUpdate(snapshotId, {
            $set: { mappings: newMappings },
          });
        }
        updated += 1;
      }
    }
  }

  // ---- Recurse into children with the accumulated allowed set. ----
  const children: any[] = await Category.find({ parentId: categoryId })
    .select("_id")
    .lean();

  for (const child of children) {
    updated += await pruneSubtree(child._id.toString(), allowed, visited);
  }

  return updated;
}

/**
 * Prune the subtree rooted at `categoryId` (inclusive). `categoryId`
 * itself is treated as the cascade entry point: its ancestor chain is
 * walked once so that the root's own snapshot is pruned with the
 * correct "parent effective" set, then the recursive walk proceeds.
 *
 * Returns the number of snapshot docs that were modified.
 */
export async function pruneDescendantSnapshots(
  categoryId: string,
): Promise<number> {
  await connection();
  if (!mongoose.Types.ObjectId.isValid(categoryId)) return 0;

  const ancestorAttrs = await collectAncestorAttrIds(categoryId);
  return pruneSubtree(categoryId, ancestorAttrs, new Set());
}

/**
 * Entry point used by property mutations. Finds every category that
 * currently uses `propertyId` as its own property, and prunes the
 * subtree under each of them.
 *
 * The subtrees may overlap (a parent and its child can both use the
 * same property); the shared `visited` set prevents double work and
 * double writes.
 */
export async function pruneDescendantsAfterPropertyUpdate(
  propertyId: string,
): Promise<{ categoriesProcessed: number; snapshotsUpdated: number }> {
  await connection();

  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    return { categoriesProcessed: 0, snapshotsUpdated: 0 };
  }

  const categories = await Category.find({
    property: new mongoose.Types.ObjectId(propertyId),
  })
    .select("_id")
    .lean();

  const visited = new Set<string>();
  let snapshotsUpdated = 0;

  for (const c of categories) {
    const categoryId = (c._id as string).toString();
    if (visited.has(categoryId)) continue;

    const ancestorAttrs = await collectAncestorAttrIds(categoryId);
    snapshotsUpdated += await pruneSubtree(categoryId, ancestorAttrs, visited);
  }

  return {
    categoriesProcessed: categories.length,
    snapshotsUpdated,
  };
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
  if (!Array.isArray(mappings) || mappings.length === 0) return [];

  // ---- 1. Collect every ID up front so we can batch-fetch. ---------
  const setIds = new Set<string>();
  const groupIds = new Set<string>();
  const attrIds = new Set<string>();

  for (const m of mappings) {
    const setId = coerceToObjectId(m?.set);
    if (setId) setIds.add(setId.toString());

    for (const g of m?.groups ?? []) {
      const groupId = coerceToObjectId(g?.group);
      if (groupId) groupIds.add(groupId.toString());

      for (const a of g?.attributes ?? []) {
        const attrId = coerceToObjectId(a?.attribute);
        if (attrId) attrIds.add(attrId.toString());
      }
    }
  }

  // ---- 2. Batch fetch everything in parallel. ----------------------
  const [sets, groups, attributes] = await Promise.all([
    setIds.size
      ? AttributeSet.find({
          _id: {
            $in: [...setIds].map((s) => new mongoose.Types.ObjectId(s)),
          },
        }).lean()
      : Promise.resolve([] as any[]),
    groupIds.size
      ? AttributeGroup.find({
          _id: {
            $in: [...groupIds].map((s) => new mongoose.Types.ObjectId(s)),
          },
        }).lean()
      : Promise.resolve([] as any[]),
    attrIds.size
      ? Attribute.find({
          _id: {
            $in: [...attrIds].map((s) => new mongoose.Types.ObjectId(s)),
          },
        }).lean()
      : Promise.resolve([] as any[]),
  ]);

  // ---- 3. Hydrate unit families manually. --------------------------
  //   (`.populate("unitFamily")` throws on corrupted refs, so we do
  //   it by hand and skip bad values with a warning.)
  const unitFamilyIdSet = new Set<string>();
  for (const a of attributes) {
    const ufId = coerceToObjectId((a as any).unitFamily);
    if (ufId) {
      unitFamilyIdSet.add(ufId.toString());
    } else if ((a as any).unitFamily) {
      console.warn(
        "[category_property] Ignoring corrupted unitFamily on attribute",
        (a as any)._id?.toString?.(),
        (a as any).unitFamily,
      );
    }
  }

  const unitFamilies = unitFamilyIdSet.size
    ? await UnitFamily.find({
        _id: {
          $in: [...unitFamilyIdSet].map((s) => new mongoose.Types.ObjectId(s)),
        },
      }).lean()
    : [];

  // ---- 4. Build lookup maps. ---------------------------------------
  const setMap = new Map<string, any>();
  for (const s of sets) setMap.set((s as any)._id.toString(), s);

  const groupMap = new Map<string, any>();
  for (const g of groups) groupMap.set((g as any)._id.toString(), g);

  const attrMap = new Map<string, any>();
  for (const a of attributes) attrMap.set((a as any)._id.toString(), a);

  const unitFamilyMap = new Map<string, any>();
  for (const u of unitFamilies) {
    unitFamilyMap.set((u as any)._id.toString(), u);
  }

  // ---- 5. Assemble. ------------------------------------------------
  const result: AttributeSetResult[] = [];

  for (const mapping of mappings) {
    const setId = coerceToObjectId(mapping?.set);
    const set = setId ? setMap.get(setId.toString()) : null;
    if (!set) continue;

    const mappingGroupIds = (mapping.groups ?? [])
      .map((g) => coerceToObjectId(g?.group))
      .filter((id): id is mongoose.Types.ObjectId => id !== null)
      .map((id) => id.toString());

    if (mappingGroupIds.length === 0) continue;

    const mappingGroups = mappingGroupIds
      .map((id) => groupMap.get(id))
      .filter(Boolean);

    // group id → mapped attributes
    const groupAttrMap: Record<string, MappedAttribute[]> = {};

    for (const gm of mapping.groups ?? []) {
      const groupId = coerceToObjectId(gm?.group)?.toString();
      if (!groupId) continue;

      const selectedAttrs: MappedAttribute[] = [];

      for (const am of gm.attributes ?? []) {
        const attrId = coerceToObjectId(am?.attribute)?.toString();
        if (!attrId) continue;
        const attrDoc: any = attrMap.get(attrId);
        if (!attrDoc) continue;

        const flags = toFlags(am as any);

        const ufId = coerceToObjectId(attrDoc.unitFamily);
        const uf = ufId ? unitFamilyMap.get(ufId.toString()) : null;

        selectedAttrs.push({
          id: attrDoc._id.toString(),
          code: attrDoc.code,
          name: attrDoc.name,
          type: attrDoc.type,
          options: attrDoc.option || [],
          isRequired: flags.isRequired,
          isHighlight: flags.isHighlight,
          unitFamily: uf
            ? {
                id: uf._id.toString(),
                name: uf.name,
                baseUnit: uf.baseUnit,
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

      return mappingGroups
        .filter((g: any) => {
          const gParent = g.parent_id?.toString() || null;
          if (parentId === null) return gParent === null;
          return gParent === parentId;
        })
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((g: any) => {
          const gId = g._id?.toString();
          return {
            id: gId,
            code: g.code,
            name: g.name,
            parentId: g.parent_id?.toString() || null,
            sortOrder: g.sort_order ?? 0,
            attributes: groupAttrMap[gId ?? ""] || [],
            children: buildTree(gId, new Set(visited)),
          };
        }) as any;
    };

    result.push({
      id: (set as any)._id.toString(),
      title: (set as any).title,
      code: (set as any).code,
      sortOrder: (set as any).sortOrder ?? 0,
      groups: buildTree(null),
    });
  }

  result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return result;
}

// ========================================================================
//  Category Property CRUD
// ========================================================================

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

  // ---- Prune stale attributes from inheriting descendants' snapshots.
  // We do NOT rebuild the snapshots: attributes are only *removed* when
  // they no longer exist in any ancestor's own property nor the
  // descendant's own property. This keeps the operation cheap and
  // avoids the cascade cost of a full re-merge.
  try {
    const { snapshotsUpdated } = await pruneDescendantsAfterPropertyUpdate(id);
    if (snapshotsUpdated > 0) {
      console.log(
        `[inheritance] Pruned ${snapshotsUpdated} descendant snapshots after property update.`,
      );
    }
  } catch (err) {
    // Never let the prune failure block the save.
    console.error("[inheritance] Prune after property update failed:", err);
  }

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

    // Snapshot which categories used this property BEFORE we unset it,
    // so we know whose subtrees to prune afterwards.
    const affected = await Category.find({ property: id }).select("_id").lean();

    await CategoryProperty.findByIdAndDelete(id);
    await Category.updateMany({ property: id }, { $unset: { property: "" } });

    // Prune each affected subtree. Their own property is now empty,
    // so any snapshot attribute that was only coming from this
    // property will be dropped.
    const visited = new Set<string>();
    let snapshotsUpdated = 0;
    for (const c of affected) {
      const categoryId = (c._id as string).toString();
      if (visited.has(categoryId)) continue;
      try {
        const ancestorAttrs = await collectAncestorAttrIds(categoryId);
        snapshotsUpdated += await pruneSubtree(
          categoryId,
          ancestorAttrs,
          visited,
        );
      } catch (err) {
        console.error(
          `[inheritance] Prune failed for category ${categoryId}:`,
          err,
        );
      }
    }

    revalidatePath("/catalog/categories/property");
    revalidatePath("/categories");
    return {
      success: true,
      message: `Category property deleted. ${snapshotsUpdated} descendant snapshot(s) pruned.`,
    };
  } catch (error: any) {
    console.error("Error deleting category property:", error);
    return { error: error.message || "Failed to delete category property." };
  }
}
