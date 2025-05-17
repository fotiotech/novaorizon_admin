"use server";

import AttributeGroup from "@/models/AttributesGroup";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// Helper function to serialize MongoDB documents
function serializeGroup(group: any) {
  return {
    _id: group._id.toString(),
    name: group.name,
    parent_id: group.parent_id ? group.parent_id.toString() : "",
    group_order: group.group_order,
    sort_order: group.sort_order,
  };
}

// Function to find all available attribute groups
export async function findAllAttributeGroups(id?: string) {
  await connection();

  try {
    const filter = id ? { _id: new mongoose.Types.ObjectId(id) } : {};

    const attributeGroups = await AttributeGroup.find(filter).lean();

    // Serialize MongoDB objects
    return attributeGroups.map(serializeGroup);
  } catch (error) {
    console.error("[AttributeGroup] Error in findAllAttributeGroups:", error);
    return null;
  }
}

// Function to create a new attribute group
export async function createAttributeGroup(
  name: string,
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
      parent_id: mongoose.Types.ObjectId.isValid(parent_id) ? new mongoose.Types.ObjectId(parent_id) : undefined,
      group_order: group_order || 0,
      sort_order: sort_order || 0,
    });

    await newGroup.save();

    // Return serialized group
    return serializeGroup(newGroup);
  } catch (error) {
    console.error("[AttributeGroup] Error creating group:", error);
    throw error;
  }
}
