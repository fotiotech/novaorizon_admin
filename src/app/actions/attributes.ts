"use server";

import { connection } from "@/utils/connection";
import Attribute from "@/models/Attribute";
import AttributeGroup from "@/models/AttributesGroup";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// Add TypeScript interfaces
interface AttributeFormData {
  codes: string[];
  names: string[];
  sort_orders: number[];
  option?: string[][];
  type: string[];
}

interface AttributeUpdateParams {
  code: string;
  name: string;
  sort_order: number;
  option?: string | string[]; // ← allow both
  type: string | string[];
}

// Function to fetch category attributes and values
export async function findAttributesAndValues(id?: string) {
  try {
    connection();
    // Build the base query—either find() or findOne({_id: id})
    let query = id ? Attribute.findOne({ _id: id }) : Attribute.find();

    // Populate only `groupId` and select specific fields, then return plain objects
    const response = await query.lean();

    return response;
  } catch (error) {
    console.error("Error in findAttributesAndValues:", error);
  }
}

export async function createAttribute(formData: AttributeFormData) {
  const { codes, names, sort_orders, option, type } = formData;

  if (!Array.isArray(names) || names.length === 0) {
    throw new Error("Missing required fields");
  }

  await connection();

  try {
    const attributes = [];
    const len = Math.max(codes.length, names.length);

    for (let i = 0; i < len; i++) {
      const rawCode = (codes[i] || "").trim();
      const rawName = (names[i] || "").trim();

      if (!rawCode) throw new Error(`Invalid attribute code at idx ${i}`);
      if (!rawName) throw new Error(`Invalid attribute name at idx ${i}`);

      const optionsArr = (option?.[i] || [])
        .map((o: string) => o.trim())
        .filter(Boolean);
      const attrType = (type[i] || "text").trim();
      const attrSortOrder = sort_orders[i] || 0;

      const filter = { code: rawCode };
      const update = {
        $set: {
          name: rawName,
          option: optionsArr,
          type: attrType,
          sort_order: attrSortOrder,
        },
      };

      const attribute = await Attribute.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
      });
      attributes.push(attribute);
    }

    revalidatePath("/admin/attributes");
    return attributes;
  } catch (error) {
    console.error("Error in createAttribute:", error);
    throw new Error("Failed to create attributes: " + (error as Error).message);
  }
}

export async function updateAttribute(
  id: string,
  params: AttributeUpdateParams
) {
  await connection();

  try {
    let optionsArr: string[] = [];

    // Handle option normalization
    if (params.option !== undefined) {
      if (Array.isArray(params.option)) {
        optionsArr = params.option.map((o) => o.trim()).filter(Boolean);
      } else if (typeof params.option === "string") {
        optionsArr = params.option
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean);
      }
    }

    // Normalize type to string
    let typeStr: string;
    if (Array.isArray(params.type)) {
      typeStr = params.type.join(",").trim();
    } else {
      typeStr = params.type.trim();
    }

    const updateData = {
      code: params.code.trim(),
      name: params.name.trim(),
      option: optionsArr,
      type: typeStr,
      sort_order: params.sort_order,
    };

    const updated = await Attribute.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      throw new Error("Attribute not found");
    }

    revalidatePath("/admin/attributes");
    return updated;
  } catch (err) {
    console.error("Error in updateAttribute:", err);
    throw err;
  }
}

// Function to delete attribute
export async function deleteAttribute(code: string) {
  await connection();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const attribute = await Attribute.findOne({ code }).session(session);
      if (!attribute) {
        throw new Error("Attribute not found");
      }

      await Attribute.findByIdAndDelete(attribute._id).session(session);
    });
  } finally {
    session.endSession();
  }
}
