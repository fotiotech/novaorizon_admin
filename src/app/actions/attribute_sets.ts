"use server";

import mongoose from "mongoose";
import AttributeSet from "@/models/AttributeSet";
import CategoryProperty from "@/models/CategoryProperty";
import { connection } from "@/utils/connection";
import { revalidatePath } from "next/cache";

// Update this to the route that actually hosts the Attribute Sets list page.
const LIST_PATH = "/catalog/attributes/sets";

// ========================================================================
//  toPlain – deep-convert Mongoose / BSON values into client-safe JSON.
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
        // fall through
      }
    }

    if (typeof anyVal.toObject === "function") {
      return toPlain(anyVal.toObject()) as any;
    }

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(anyVal)) {
      out[k] = toPlain(v);
    }
    return out as any;
  }

  return value;
}

// ========================================================================
//  createAttributeSet
// ========================================================================
export async function createAttributeSet(data: {
  title: string;
  code: string;
  description?: string;
  sortOrder?: number;
}) {
  await connection();

  const title = data.title?.trim() ?? "";
  const code = data.code?.trim() ?? "";

  if (!title) return { success: false, error: "Title is required" };
  if (!code) return { success: false, error: "Code is required" };

  try {
    const existing = await AttributeSet.findOne({ code });
    if (existing) {
      return { success: false, error: `Code "${code}" already exists` };
    }

    const attributeSet = new AttributeSet({
      title,
      code,
      description: data.description?.trim(),
      sortOrder: data.sortOrder ?? 0,
    });
    await attributeSet.save();

    revalidatePath(LIST_PATH);
    return { success: true, data: toPlain(attributeSet.toObject()) };
  } catch (error: any) {
    console.error("[createAttributeSet]", error);
    return {
      success: false,
      error: error?.message || "Failed to create attribute set",
    };
  }
}

// ========================================================================
//  getAttributeSets
// ========================================================================
export async function getAttributeSets() {
  await connection();
  try {
    const attributeSets = await AttributeSet.find()
      .sort({ sortOrder: 1 })
      .lean();
    return { success: true, data: toPlain(attributeSets) };
  } catch (error: any) {
    console.error("[getAttributeSets]", error);
    return { success: false, error: "Failed to fetch attribute sets" };
  }
}

// ========================================================================
//  getAttributeSet
// ========================================================================
export async function getAttributeSet(id: string) {
  await connection();
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid attribute set ID" };
    }
    const set = await AttributeSet.findById(id).lean();
    if (!set) return { success: false, error: "Attribute set not found" };
    return { success: true, data: toPlain(set) };
  } catch (error: any) {
    console.error("[getAttributeSet]", error);
    return { success: false, error: "Failed to fetch attribute set" };
  }
}

// ========================================================================
//  updateAttributeSet
// ========================================================================
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

  const title = data.title?.trim() ?? "";
  const code = data.code?.trim() ?? "";

  if (!title) return { success: false, error: "Title is required" };
  if (!code) return { success: false, error: "Code is required" };

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid attribute set ID" };
    }

    const existing = await AttributeSet.findOne({
      code,
      _id: { $ne: id },
    });
    if (existing) {
      return { success: false, error: `Code "${code}" already exists` };
    }

    const updated = await AttributeSet.findByIdAndUpdate(
      id,
      {
        title,
        code,
        description: data.description,
        sortOrder: data.sortOrder,
      },
      { new: true },
    );

    if (!updated) {
      return { success: false, error: "Attribute set not found" };
    }

    revalidatePath(LIST_PATH);
    return { success: true, data: toPlain(updated.toObject()) };
  } catch (error: any) {
    console.error("[updateAttributeSet]", error);
    return {
      success: false,
      error: error?.message || "Failed to update attribute set",
    };
  }
}

// ========================================================================
//  deleteAttributeSet
//
//  Detaches this set from every CategoryProperty mapping in one round-trip,
//  then deletes the set itself.
// ========================================================================
export async function deleteAttributeSet(id: string) {
  await connection();
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid attribute set ID" };
    }

    const setObjectId = new mongoose.Types.ObjectId(id);

    // Single update: pull every mapping whose `set` field matches.
    await CategoryProperty.updateMany(
      { "mappings.set": setObjectId },
      { $pull: { mappings: { set: setObjectId } } },
    );

    const deleted = await AttributeSet.findByIdAndDelete(setObjectId);
    if (!deleted) {
      return { success: false, error: "Attribute set not found" };
    }

    revalidatePath(LIST_PATH);
    return { success: true };
  } catch (error: any) {
    console.error("[deleteAttributeSet]", error);
    return {
      success: false,
      error: error?.message || "Failed to delete attribute set",
    };
  }
}
