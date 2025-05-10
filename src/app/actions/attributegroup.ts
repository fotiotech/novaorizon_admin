"use server";

import AttributeGroup from "@/models/AttributesGroup";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// Function to find all available attribute groups
export async function findAllAttributeGroups(categoryId?: string) {
  await connection();

  try {
    let attributeGroups;
    if (categoryId) {
      attributeGroups = await AttributeGroup.find({
        category_id: categoryId,
      }).populate("category_id", "name");
      return attributeGroups;
    } else {
      attributeGroups = await AttributeGroup.find({}).populate(
        "category_id",
        "name"
      );
      console.log("All attribute groups:", attributeGroups);
      return attributeGroups;
    }
  } catch (error) {
    console.error("Error fetching attribute groups:", error);
    return null;
  }
}

// Function to create a new attribute group
export async function createAttributeGroup(
  name: string,
  parent_id: string,
  catId: string
) {
  await connection();

  if (!name) {
    console.error("Group name is required.");
    return { error: "Group name is required." };
  }

  // Create a new attribute group
  const newGroup = new AttributeGroup({
    name: name,
    // parent_id: new mongoose.Types.ObjectId(parent_id) || "",
    category_id: new mongoose.Types.ObjectId(catId),
  });

  await newGroup.save();

  revalidatePath("/admin/attributes");
}
