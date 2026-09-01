"use server";

import AttributeSet from "@/models/AttributeSet";
import { connection } from "@/utils/connection";
import { revalidatePath } from "next/cache";

export async function createAttributeSet(data: {
  title: string;
  code: string;
  description?: string;
  sortOrder?: number;
}) {
  await connection();

  const { title, code, description, sortOrder } = data;

  if (!title.trim()) throw new Error("Title is required");
  if (!code.trim()) throw new Error("Code is required");

  // Check uniqueness of code
  const existing = await AttributeSet.findOne({ code });
  if (existing) throw new Error(`Code "${code}" already exists`);

  const attributeSet = new AttributeSet({
    title: title.trim(),
    code: code.trim(),
    description: description?.trim(),
    sortOrder: sortOrder || 0,
  });
  await attributeSet.save();

  revalidatePath("/attributes");
  return { success: true, data: attributeSet };
}

export async function getAttributeSets() {
  await connection();
  try {
    const attributeSets = await AttributeSet.find().lean();
    return { success: true, data: attributeSets };
  } catch (error) {
    return { success: false, error: "Failed to fetch attribute sets" };
  }
}

export async function getAttributeSet(id: string) {
  await connection();
  const set = await AttributeSet.findById(id).lean();
  if (!set) throw new Error("Attribute set not found");
  return {
    ...set,
    _id: set._id.toString(),
  };
}

export async function updateAttributeSet(
  id: string,
  data: {
    title: string;
    code: string;
    description?: string;
    sortOrder?: number;
  },
) {
  await connection();

  const { title, code, description, sortOrder } = data;

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
      sortOrder,
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
