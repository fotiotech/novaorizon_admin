"use server";

import AttributeSet from "@/models/AttributeSet";
import "@/models/AttributeGroup";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

export async function createAttributeSet(data: {
  title: string;
  code: string;
  description?: string;
  groupIds: string[]; // array of AttributeGroup _ids
  sort_order?: number;
}) {
  await connection();

  const { title, code, description, groupIds, sort_order } = data;

  if (!title.trim()) throw new Error("Title is required");
  if (!code.trim()) throw new Error("Code is required");
  if (!groupIds || groupIds.length === 0)
    throw new Error("Select at least one attribute group");

  const attributeSet = new AttributeSet({
    title: title.trim(),
    code: code.trim(),
    description: description?.trim(),
    sort_order: sort_order,
    groups: groupIds, // ✅ fixed: was 'attributeGroup'
  });
  await attributeSet.save();

  revalidatePath("/attributes");
  return { success: true, data: attributeSet };
}

export async function getAttributeSets() {
  await connection();
  try {
    const attributeSets = await AttributeSet.find()
      .populate("groups") // ✅ fixed: was 'attributeGroup'
      .lean();
    return { success: true, data: attributeSets };
  } catch (error) {
    return { success: false, error: "Failed to fetch attribute sets" };
  }
}

export async function getAttributeSet(id: string) {
  await connection();
  const set = await AttributeSet.findById(id).populate("groups").lean(); // ✅ fixed
  if (!set) throw new Error("Attribute set not found");
  return {
    ...set,
    _id: set._id.toString(),
    groups: set.groups?.map((g: any) => g._id.toString()), // ✅ fixed: was 'attributeGroup'
  };
}

export async function updateAttributeSet(
  id: string,
  data: {
    title: string;
    code: string;
    description?: string;
    groupIds: string[];
    sort_order?: number;
  },
) {
  await connection();

  const { title, code, description, groupIds, sort_order } = data;

  // Validate uniqueness of code (excluding itself)
  const existing = await AttributeSet.findOne({ code, _id: { $ne: id } });
  if (existing) {
    throw new Error(`Code "${code}" already exists`);
  }

  const updated = await AttributeSet.findByIdAndUpdate(
    id,
    {
      title,
      code,
      description,
      sort_order,
      groups: groupIds.map((id) => new mongoose.Types.ObjectId(id)), // ✅ fixed
    },
    { new: true },
  );

  revalidatePath("/attributes");
  return { success: true, data: updated };
}

export async function deleteAttributeSet(id: string) {
  await connection();
  try {
    await AttributeSet.findByIdAndDelete(id);
    revalidatePath("/attribute-sets");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete attribute set" };
  }
}
