"use server";

import AttributeGroup from "@/models/AttributesGroup";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// types.ts
export interface Group {
  _id: string;
  name: string;
  parent_id: string; // "" if root
  group_order: number;
  children?: Group[];
}


function serializeGroup(group: any): Group {
  return {
    _id: group._id.toString(),
    name: group.name,
    parent_id: group.parent_id ? group.parent_id.toString() : "",
    group_order: group.group_order,
  };
}

function buildTree(flatGroups: Group[]): Group[] {
  const map: Record<string, Group & { children: Group[] }> = {};
  flatGroups.forEach(g => map[g._id] = { ...g, children: [] });

  const roots: (Group & { children: Group[] })[] = [];
  flatGroups.forEach(g => {
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
    nodes.forEach(n => sortTree(n.children as unknown as any[]));
  };

  sortTree(roots);
  return roots;
}

export async function findAllAttributeGroups(id?: string): Promise<Group[] | null> {
  await connection();
  try {
    const filter = id ? { _id: new mongoose.Types.ObjectId(id) } : {};
    const attributeGroups = await AttributeGroup.find(filter).lean();
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
  name: string,
  code: string,
  parent_id: string,
  group_order: number,
  sort_order: number,
  
) {
  await connection();

  if (!name) {
    console.error("Group name is required.");
    return { error: "Group name is required." };
  }

  try {
    // Create a new attribute group
    const newGroup = new AttributeGroup({
      name: name.trim(),
      code: code.trim(),
      parent_id: mongoose.Types.ObjectId.isValid(parent_id) ? new mongoose.Types.ObjectId(parent_id) : undefined,
      group_order: group_order || 0,
    });

    await newGroup.save();

    // Return serialized group
    return serializeGroup(newGroup);
  } catch (error) {
    console.error("[AttributeGroup] Error creating group:", error);
    throw error;
  }
}
