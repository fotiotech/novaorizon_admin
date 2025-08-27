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
  option?: string[][];
  type: string[];
}

interface AttributeUpdateParams {
  code: string;
  name: string;
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
  const { codes, names } = formData;

  if (!Array.isArray(names) || names.length === 0) {
    throw new Error("Missing required fields");
  }

  await connection();

  try {
    const attributes: (typeof Attribute)[] = [];
    const len = Math.max(codes.length, names.length);

    for (let i = 0; i < len; i++) {
      const rawCode = (codes[i] || "").trim();
      const rawName = (names[i] || "").trim();

      if (!rawCode) throw new Error(`Invalid attribute code at idx ${i}`);
      if (!rawName) throw new Error(`Invalid attribute name at idx ${i}`);

      const rawOpt = Array.isArray(formData.option) ? formData.option[i] : [];
      const optionsArr = Array.isArray(rawOpt)
        ? rawOpt.map((o) => o.trim()).filter(Boolean)
        : [];

      const attrType = Array.isArray(formData.type)
        ? formData.type[i] ?? "text"
        : formData.type ?? "text";

      const filter = { code: rawCode };
      const update = {
        $set: {
          name: rawName,
          option: optionsArr,
          type: attrType,
        },
      };

      const attribute = await Attribute.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
      });
      attributes.push(attribute!);
    }

    revalidatePath("/admin/attributes");
    return attributes;
  } catch (error) {
    console.error("Error in createAttribute:", error);
    throw new Error("Failed to create attributes: " + (error as Error).message);
  }
}

// Function to update attribute
export async function updateAttribute(
  id: string,
  params: AttributeUpdateParams
) {
  await connection();
  // no need for a full transaction unless you’re updating multiple docs
  try {
    // 1) Normalize `option` into string[]
    let optionsArr: string[] = [];
    if (Array.isArray(params.option)) {
      // could be string[] or even string[][]
      optionsArr = (params.option as any[])
        .flat()
        .map((o) => (typeof o === "string" ? o.trim() : ""))
        .filter(Boolean);
    } else if (typeof params.option === "string") {
      // split comma-list or JSON-string
      try {
        // try JSON first
        const parsed = JSON.parse(params.option);

        if (Array.isArray(parsed)) {
          optionsArr = parsed.map((o) => String(o).trim()).filter(Boolean);
        } else {
          throw new Error("not-an-array");
        }
      } catch {
        // fallback to comma-split
        optionsArr = params.option
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean);
      }
    } else {
      optionsArr = [];
    }

    // 2) Normalize `type` into string
    const attrType =
      Array.isArray(params.type) && params.type.length > 0
        ? String(params.type[0]).trim()
        : String(params.type || "text").trim();

    // 3) Perform the update
    const updated = await Attribute.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          code: params.code.trim(),
          name: params.name.trim(),
          option: optionsArr,
          type: attrType,
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new Error("Attribute not found");
    }

    console.log(updated);

    revalidatePath("/admin/attributes");
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
