"use server";
import { connection } from "@/utils/connection";
import AttributeGroup from "@/models/AttributesGroup";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

export interface Group {
  _id: string;
  code: string;
  name: string;
  parent_id: string;
  attributes?: string[] | [{ name: string; _id?: string }];
  createdAt?: Date;
  group_order: number;
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
            : { _id: a._id?.toString(), code: a.code, name: a.name }
        )
      : [],
    createdAt: group.createdAt ? new Date(group.createdAt) : undefined,
    group_order: group.group_order,
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
    nodes.sort((a, b) => a.group_order - b.group_order);
    nodes.forEach((n: any) => sortTree(n.children));
  };

  sortTree(roots);
  return roots;
}

export async function findAttributeForGroups(
  id?: string
): Promise<Group[] | null> {
  await connection();
  try {
    const filter = id ? { _id: new mongoose.Types.ObjectId(id) } : {};
    const attributeGroups = await AttributeGroup.find(filter)
      .populate("attributes", "_id code name")
      .lean();
    return attributeGroups.map(serializeGroup);
  } catch (error) {
    console.error("[AttributeGroup] Error in findAttributeForGroups:", error);
    return null;
  }
}

export async function findAllAttributeGroups(
  id?: string
): Promise<Group[] | null> {
  await connection();
  try {
    const filter = id ? { _id: new mongoose.Types.ObjectId(id) } : {};
    const attributeGroups = await AttributeGroup.find(filter)
      .populate("attributes", "name code _id")
      .lean();
    return buildTree(attributeGroups.map(serializeGroup));
  } catch (error) {
    console.error("[AttributeGroup] Error in findAllAttributeGroups:", error);
    return null;
  }
}

export async function createAttributeGroup(
  action: string | null,
  name: string,
  code: string,
  parent_id: string,
  attributes: string[] = [],
  group_order: number,
  sort_order: number
) {
  await connection();
  try {
    if (action && action !== "create" && attributes.length > 0) {
      const res = await AttributeGroup.findByIdAndUpdate(
        { _id: new mongoose.Types.ObjectId(action) },
        {
          attributes: attributes.map(
            (attr) => new mongoose.Types.ObjectId(attr)
          ),
        },
        { new: true }
      );
      revalidatePath("/attributes");
      return serializeGroup(res);
    } else if (code && name) {
      const newGroup = await AttributeGroup.findOneAndUpdate(
        { name },
        {
          code,
          name,
          parent_id: parent_id ? new mongoose.Types.ObjectId(parent_id) : null,
          attributes: attributes.map(
            (attr) => new mongoose.Types.ObjectId(attr)
          ),
          group_order,
          sort_order,
        },
        { upsert: true, new: true, lean: true }
      );
      revalidatePath("/attributes");
      return serializeGroup(newGroup);
    }
  } catch (error) {
    console.error("[AttributeGroup] Error creating group:", error);
    throw error;
  }
}

export async function findGroup(id?: string) {
  await connection();
  try {
    if (!id) return;
    const attributeGroups = await AttributeGroup.findOne({ _id: id });
    return serializeGroup(attributeGroups);
  } catch (error) {
    console.error("[AttributeGroup] Error in findAttributeForGroups:", error);
    return null;
  }
}

export async function updateAttributeGroup(
  id: string,
  updates: Partial<{
    name: string;
    code: string;
    parent_id: string;
    attributes: string[];
    group_order: number;
  }>
) {
  await connection();
  try {
    const updated = await AttributeGroup.findByIdAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        ...updates,
        ...(updates.parent_id && {
          parent_id: new mongoose.Types.ObjectId(updates.parent_id),
        }),
        ...(updates.attributes && {
          attributes: updates.attributes.map(
            (attr) => new mongoose.Types.ObjectId(attr)
          ),
        }),
      },
      { new: true }
    ).lean();
    revalidatePath("/attributes");
    return serializeGroup(updated);
  } catch (error) {
    console.error("[AttributeGroup] Error updating group:", error);
    throw error;
  }
}

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
