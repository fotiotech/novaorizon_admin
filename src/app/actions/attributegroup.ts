// attributegroup.ts
"use server";
import { connection } from "@/utils/connection";
import AttributeGroup from "@/models/AttributeGroup";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import Attribute from "@/models/Attribute";

export interface Group {
  _id: string;
  code: string;
  name: string;
  parent_id: string;
  attributes?: string[] | [{ name: string; _id?: string }];
  createdAt?: Date;
  sort_order: number;
  children?: Group[];
}

function serializeGroup(group: any): Group {
  return {
    _id: group._id.toString(),
    code: group.code,
    name: group.name,
    parent_id: group.parent_id ? group.parent_id.toString() : "",
    attributes: group.attributes
      ? group.attributes.map((a: any) =>
          a === ""
            ? a.toString()
            : { _id: a._id?.toString(), code: a.code, name: a.name },
        )
      : [],
    createdAt: group.createdAt ? new Date(group.createdAt) : undefined,
    sort_order: group.sort_order,
  };
}

function buildTree(flatGroups: Group[]): Group[] {
  const map: Record<string, Group & { children: Group[] }> = {};
  flatGroups.forEach((g) => (map[g._id] = { ...g, children: [] }));

  const roots: (Group & { children: Group[] })[] = [];
  flatGroups.forEach((g) => {
    if (g.parent_id) {
      const parent = map[g.parent_id];
      if (parent) parent.children.push(map[g._id]);
    } else {
      roots.push(map[g._id]);
    }
  });

  const sortTree = (nodes: (Group & { children: Group[] })[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach((n: any) => sortTree(n.children));
  };

  sortTree(roots);
  return roots;
}

// --- findAttributeForGroups (unchanged, correctly populates attributes) ---
export async function findAttributeForGroups(
  id?: string,
): Promise<Group[] | null> {
  await connection();
  try {
    const filter = id ? { _id: new mongoose.Types.ObjectId(id) } : {};
    const attributeGroups = await AttributeGroup.find(filter).lean<any>();

    const allSubdocs: { id: any; groupId: string }[] = [];
    for (const group of attributeGroups) {
      for (const sub of group.attributes || []) {
        if (sub.id) {
          allSubdocs.push({ id: sub.id, groupId: group?._id.toString() });
        }
      }
    }

    const attrIds: string[] = [];
    for (const sub of allSubdocs) {
      const idStr = sub.id?.toString();
      if (idStr && mongoose.Types.ObjectId.isValid(idStr)) {
        attrIds.push(idStr);
      }
    }

    const attributes = await Attribute.find({ _id: { $in: attrIds } })
      .select("_id code name")
      .lean<{ _id: mongoose.Types.ObjectId; code: string; name: string }[]>();
    const attrMap: Record<
      string,
      { _id: mongoose.Types.ObjectId; code: string; name: string }
    > = {};
    for (const attr of attributes) {
      const attrId = attr._id.toString();
      attrMap[attrId] = attr;
    }

    const result = attributeGroups.map((group: any) => {
      const groupAttrs = (group.attributes || [])
        .map((sub: any) => {
          const attrDoc = attrMap[sub.id?.toString()];
          if (!attrDoc) return null;
          return {
            _id: attrDoc._id,
            code: attrDoc.code,
            name: attrDoc.name,
          };
        })
        .filter(Boolean);

      return {
        _id: group._id.toString(),
        code: group.code,
        name: group.name,
        parent_id: group.parent_id ? group.parent_id.toString() : "",
        attributes: groupAttrs,
        createdAt: group.createdAt,
        sort_order: group.sort_order,
      };
    });

    return result;
  } catch (error) {
    console.error("[AttributeGroup] Error in findAttributeForGroups:", error);
    return null;
  }
}

// --- findAllAttributeGroups (fixed: now correctly populates attributes) ---
export async function findAllAttributeGroups(
  id?: string,
): Promise<Group[] | null> {
  await connection();
  try {
    const filter = id ? { _id: new mongoose.Types.ObjectId(id) } : {};
    const groups = await AttributeGroup.find(filter).lean<any>();

    // Collect all attribute subdocument IDs
    const allSubdocs: { id: any; groupId: string }[] = [];
    for (const group of groups) {
      for (const sub of group.attributes || []) {
        if (sub.id) {
          allSubdocs.push({ id: sub.id, groupId: group._id.toString() });
        }
      }
    }

    const attrIds = allSubdocs
      .map((s) => s.id?.toString())
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    // Fetch all attributes once
    const attributes = await Attribute.find({ _id: { $in: attrIds } })
      .select("_id code name")
      .lean<{ _id: mongoose.Types.ObjectId; code: string; name: string }[]>();
    const attrMap: Record<string, { _id: string; code: string; name: string }> =
      {};
    for (const attr of attributes) {
      attrMap[attr._id.toString()] = {
        _id: attr._id.toString(),
        code: attr.code,
        name: attr.name,
      };
    }

    // Build group objects with populated attributes
    const populatedGroups = groups.map((group: any) => {
      const groupAttrs = (group.attributes || [])
        .map((sub: any) => {
          const attrId = sub.id?.toString();
          return attrMap[attrId] || null;
        })
        .filter(Boolean);

      return {
        _id: group._id.toString(),
        code: group.code,
        name: group.name,
        parent_id: group.parent_id ? group.parent_id.toString() : "",
        attributes: groupAttrs,
        createdAt: group.createdAt,
        sort_order: group.sort_order,
      };
    });

    return buildTree(populatedGroups);
  } catch (error) {
    console.error("[AttributeGroup] Error in findAllAttributeGroups:", error);
    return null;
  }
}

// --- createAttributeGroup (unchanged) ---
export async function createAttributeGroup(
  action: string | null,
  groupId: string,
  name: string,
  code: string,
  parent_id: string,
  attributes: string[] = [],
  sort_order: number,
) {
  await connection();
  try {
    if (!action) return;
    if (action === "add attributes" && attributes.length > 0) {
      const objectIdAttributes = attributes.map(
        (attr) => new mongoose.Types.ObjectId(attr),
      );
      const res = await AttributeGroup.findByIdAndUpdate(
        { _id: new mongoose.Types.ObjectId(groupId) },
        {
          $addToSet: {
            attributes: { $each: objectIdAttributes },
          },
        },
        { new: true },
      );
      revalidatePath("/attributes");
      return serializeGroup(res);
    } else if (action === "create" || action === "edit") {
      const newGroup = await AttributeGroup.findOneAndUpdate(
        { name },
        {
          code,
          name,
          parent_id: parent_id ? parent_id : undefined,
          attributes: attributes.map(
            (attr) => new mongoose.Types.ObjectId(attr),
          ),
          sort_order: sort_order ?? null,
        },
        { upsert: true, new: true, lean: true },
      );
      revalidatePath("/attributes");
      return serializeGroup(newGroup);
    }
  } catch (error) {
    console.error("[AttributeGroup] Error creating group:", error);
    throw error;
  }
}

// --- findGroup (unchanged) ---
export async function findGroup(id?: string) {
  try {
    await connection();

    const buildGroupTreeWithValues = (
      groups: any[],
      parentId: string | null = null,
    ): any[] => {
      return groups
        .filter(
          (group) =>
            (!parentId && !group.parent_id) ||
            (parentId && group.parent_id?.toString() === parentId),
        )
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((group) => ({
          _id: group._id?.toString(),
          code: group.code,
          name: group.name,
          parent_id: group.parent_id?.toString(),
          sort_order: group.sort_order,
          attributes: group.attributes,
          children: buildGroupTreeWithValues(groups, group?._id?.toString()),
        }));
    };

    const groups = await AttributeGroup.find({})
      .populate("attributes")
      .sort({ sort_order: 1 })
      .lean()
      .exec();

    if (!groups || groups.length === 0) {
      console.error("No groups found");
      return [];
    }

    if (id) {
      const entireTree = buildGroupTreeWithValues(groups);
      const findGroupInTree = (tree: any[], targetId: string): any => {
        for (const node of tree) {
          if (node._id === targetId) return node;
          if (node.children) {
            const found = findGroupInTree(node.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const groupNode = findGroupInTree(entireTree, id);
      if (!groupNode) {
        return { success: false, error: "Group not found" };
      }
      return groupNode;
    }

    return buildGroupTreeWithValues(groups);
  } catch (error) {
    console.error("Error finding groups:", error);
    return { success: false, error: "Failed to fetch groups" };
  }
}

// --- updateAttributeGroup (unchanged, but returns the updated group) ---
export async function updateAttributeGroup(
  id: string,
  updates: Partial<{
    name: string;
    code: string;
    parent_id: string | null;
    attributes: string[];
    sort_order: number;
  }>,
) {
  await connection();
  try {
    const updateData: any = { ...updates };

    if (updates.parent_id !== undefined) {
      updateData.parent_id = updates.parent_id
        ? new mongoose.Types.ObjectId(updates.parent_id)
        : null;
    }

    if (updates.attributes !== undefined) {
      const attrSubdocs = updates.attributes
        .filter((attr) => mongoose.Types.ObjectId.isValid(attr))
        .map((attr) => ({
          id: new mongoose.Types.ObjectId(attr),
          isRequired: false,
        }));
      updateData.attributes = attrSubdocs;
    }

    const updated = await AttributeGroup.findByIdAndUpdate(id, updateData, {
      new: true,
    }).lean();

    revalidatePath("/attributes");
    return serializeGroup(updated);
  } catch (error) {
    console.error("[AttributeGroup] Error updating group:", error);
    throw error;
  }
}

// --- deleteAttributeGroup (unchanged) ---
export async function deleteAttributeGroup(id: string) {
  await connection();
  try {
    await AttributeGroup.findByIdAndDelete({
      _id: new mongoose.Types.ObjectId(id),
    });
    revalidatePath("/attributes");
    return { success: true };
  } catch (error) {
    console.error("[AttributeGroup] Error deleting group:", error);
    throw error;
  }
}
