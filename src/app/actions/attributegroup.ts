"use server";
import { connection } from "@/utils/connection";

import AttributeGroup from "@/models/AttributesGroup";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// types.ts
export interface Group {
  _id: string;
  groupId?: string; // Optional, used for editing existing groups
  name: string;
  parent_id: string; // "" if root
  attributes?: string[] | [{ name: string; _id?: string }]; // Array of attribute IDs
  createdAt?: Date;
  group_order: number;
  children?: Group[];
}

function serializeGroup(group: any): Group {
  return {
    _id: group._id.toString(),
    name: group.name,
    parent_id: group.parent_id ? group.parent_id.toString() : "",
    attributes: group.attributes
      ? group.attributes.map((a: any) =>
          a === "" ? a.toString() : { _id: a._id?.toString(), name: a.name }
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

  const sortFn = (a: Group, b: Group) => {
    if (a.group_order !== b.group_order) return a.group_order - b.group_order;
  };

  // Recursively sort each level
  const sortTree = (nodes: (Group & { children: Group[] })[]) => {
    nodes.forEach((n) => sortTree(n.children as unknown as any[]));
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
      .populate("attributes", "_id name")
      .lean();
    const serialized = attributeGroups.map(serializeGroup);
    // Build nested tree before returning
    console.log(
      "Serialized Attribute Groups:",
      serialized.map((g) => g.attributes?.map((a) => a))
    );
    return serialized;
  } catch (error) {
    console.error("[AttributeGroup] Error in findAllAttributeGroups:", error);
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
      .populate("attributes", "name _id")
      .lean();
    const serialized = attributeGroups.map(serializeGroup);
    // Build nested tree before returning
    return buildTree(serialized);
  } catch (error) {
    console.error("[AttributeGroup] Error in findAllAttributeGroups:", error);
    return null;
  }
}

// Function to create a new attribute group
export async function createAttributeGroup(
  groupId: string | null,
  name: string,
  code: string,
  parent_id: string,
  attributes: string[] = [],
  group_order: number,
  sort_order: number
) {
  await connection();
  console.log("groupId:", groupId);
  try {
    if (groupId && groupId !== "create" && attributes.length > 0) {
      // If groupId is provided, update the existing group
      const res = await AttributeGroup.findByIdAndUpdate(
        { _id: new mongoose.Types.ObjectId(groupId) },
        {
          attributes: attributes.map(
            (attr) => new mongoose.Types.ObjectId(attr)
          ),
        },
        { new: true }
      );
      console.log("Updated Attribute Group:", res);
      // revalidatePath("/attributes");
    } else if (name) {
      // Create a new attribute group
      const newGroup = await AttributeGroup.findOneAndUpdate(
        { name },
        {
          name,
          code,
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
      // Return serialized group
      return serializeGroup(newGroup);
    }
  } catch (error) {
    console.error("[AttributeGroup] Error creating group:", error);
    throw error;
  }
}
