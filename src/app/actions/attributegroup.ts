// attributegroup.ts
"use server";
import { connection } from "@/utils/connection";
import AttributeGroup from "@/models/AttributeGroup";
import CategoryProperty from "@/models/CategoryProperty";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

export interface Group {
  _id: string;
  code: string;
  name: string;
  parentId: string;
  createdAt?: Date;
  sortOrder: number;
  children?: Group[];
}

function serializeGroup(group: any): Group {
  return {
    _id: group._id.toString(),
    code: group.code,
    name: group.name,
    parentId: group.parentId ? group.parentId.toString() : "",
    createdAt: group.createdAt ? new Date(group.createdAt) : undefined,
    sortOrder: group.sortOrder,
  };
}

function buildTree(flatGroups: Group[]): Group[] {
  const map: Record<string, Group & { children: Group[] }> = {};
  flatGroups.forEach((g) => (map[g._id] = { ...g, children: [] }));

  const roots: (Group & { children: Group[] })[] = [];
  flatGroups.forEach((g) => {
    if (g.parentId) {
      const parent = map[g.parentId];
      if (parent) parent.children.push(map[g._id]);
    } else {
      roots.push(map[g._id]);
    }
  });

  const sortTree = (nodes: (Group & { children: Group[] })[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n: any) => sortTree(n.children));
  };

  sortTree(roots);
  return roots;
}

// --- findAllAttributeGroups ---
export async function findAllAttributeGroups(
  id?: string,
): Promise<Group[] | null> {
  await connection();
  try {
    const filter = id ? { _id: new mongoose.Types.ObjectId(id) } : {};
    const groups = await AttributeGroup.find(filter).lean<any>();

    const populatedGroups = groups.map((group: any) => ({
      _id: group._id.toString(),
      code: group.code,
      name: group.name,
      parentId: group.parentId ? group.parentId.toString() : "",
      createdAt: group.createdAt,
      sortOrder: group.sortOrder,
    }));

    return buildTree(populatedGroups);
  } catch (error) {
    console.error("[AttributeGroup] Error in findAllAttributeGroups:", error);
    return null;
  }
}

// --- createAttributeGroup ---
export async function createAttributeGroup(
  action: string | null,
  groupId: string,
  name: string,
  code: string,
  parentId: string,
  sortOrder: number,
) {
  await connection();
  try {
    if (!action) return;
    if (action === "create" || action === "edit") {
      const newGroup = await AttributeGroup.findOneAndUpdate(
        { name },
        {
          code,
          name,
          parentId: parentId ? parentId : undefined,
          sortOrder: sortOrder ?? null,
        },
        { upsert: true, new: true, lean: true },
      );
      revalidatePath("/catalog/attributes/groups");
      return serializeGroup(newGroup);
    }
  } catch (error) {
    console.error("[AttributeGroup] Error creating group:", error);
    throw error;
  }
}

// --- findGroup ---
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
            (!parentId && !group.parentId) ||
            (parentId && group.parentId?.toString() === parentId),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((group) => ({
          _id: group._id?.toString(),
          code: group.code,
          name: group.name,
          parentId: group.parentId?.toString(),
          sortOrder: group.sortOrder,
          children: buildGroupTreeWithValues(groups, group?._id?.toString()),
        }));
    };

    const groups = await AttributeGroup.find({})
      .sort({ sortOrder: 1 })
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

// --- updateAttributeGroup ---
export async function updateAttributeGroup(
  id: string,
  updates: Partial<{
    name: string;
    code: string;
    parentId: string | null;
    sortOrder: number;
  }>,
) {
  await connection();
  try {
    const updateData: any = { ...updates };

    if (updates.parentId !== undefined) {
      updateData.parentId = updates.parentId
        ? new mongoose.Types.ObjectId(updates.parentId)
        : null;
    }

    const updated = await AttributeGroup.findByIdAndUpdate(id, updateData, {
      new: true,
    }).lean();

    revalidatePath("/catalog/attributes/groups");
    return serializeGroup(updated);
  } catch (error) {
    console.error("[AttributeGroup] Error updating group:", error);
    throw error;
  }
}

// --- deleteAttributeGroup ---
export async function deleteAttributeGroup(id: string) {
  await connection();
  try {
    const groupObjectId = new mongoose.Types.ObjectId(id);

    // Orphan children — do not cascade delete.
    await AttributeGroup.updateMany(
      { parentId: groupObjectId },
      { $set: { parentId: null } },
    );

    // Remove this group from any CategoryProperty mappings that referenced it.
    const categoryProperties = await CategoryProperty.find({});
    for (const property of categoryProperties) {
      let changed = false;
      property.mappings = (property.mappings || []).map((mapping: any) => ({
        ...mapping,
        groups: (mapping.groups || []).filter((group: any) => {
          const matches = group.group?.toString?.() === id;
          if (matches) changed = true;
          return !matches;
        }),
      }));

      if (changed) {
        await property.save();
      }
    }

    await AttributeGroup.findByIdAndDelete(groupObjectId);
    revalidatePath("/catalog/attributes/groups");
    return { success: true };
  } catch (error) {
    console.error("[AttributeGroup] Error deleting group:", error);
    throw error;
  }
}
