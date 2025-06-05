"use server";

import { connection } from "@/utils/connection";
import Attribute from "@/models/Attributes";
import AttributeGroup from "@/models/AttributesGroup";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// Add TypeScript interfaces
interface AttributeFormData {
  groupId: string;
  names: string[];
  option?: string[][];
  type: string[];
  isHighlight: boolean[];
  isVariants: boolean[];
}

interface AttributeUpdateParams {
  name: string;
  option?: string | string[]; // ← allow both
  type: string | string[];
  groupId: string;
  isHighlight: boolean;
  isVariant: boolean;
}

// Function to fetch category attributes and values
export async function findAttributesAndValues(id?: string) {
  try {
    connection();
    // Build the base query—either find() or findOne({_id: id})
    let query = id ? Attribute.findOne({ _id: id }) : Attribute.find();

    // Populate only `groupId` and select specific fields, then return plain objects
    const response = await query
      .populate("groupId", "name group_order sort_order")
      .lean();

    console.log("Response from findAttributesAndValues:", response);
    return response;
  } catch (error) {
    console.error("Error in findAttributesAndValues:", error);
  }
}

export async function createAttribute(formData: AttributeFormData) {
  const { groupId, names, option, type, isHighlight, isVariants } = formData;

  if (!groupId || !Array.isArray(names) || names.length === 0) {
    throw new Error("Missing required fields");
  }

  await connection();

  try {
    const attributes: (typeof Attribute)[] = [];

    for (let i = 0; i < names.length; i++) {
      const rawName = names[i].trim();
      if (!rawName) throw new Error(`Invalid attribute name at idx ${i}`);

      // grab THIS attribute’s options (an array of strings)
      const rawOpt = Array.isArray(formData.option) ? formData.option[i] : [];
      const optionsArr = Array.isArray(rawOpt)
        ? rawOpt.map((o) => o.trim()).filter(Boolean)
        : [];

      // grab THIS attribute’s type
      const attrType = Array.isArray(formData.type)
        ? formData.type[i] ?? "text"
        : formData.type ?? "text";

      const filter = { groupId, name: rawName };
      const update = {
        $set: {
          option: optionsArr,
          type: attrType,
          isVariant: Boolean(formData.isVariants[i]),
          is_highlight: Boolean(formData.isHighlight[i]),
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
      id,
      {
        $set: {
          name: params.name.trim(),
          option: optionsArr,
          type: attrType,
          groupId: params.groupId, // mongoose will cast string → ObjectId
          is_highlight: Boolean(params.isHighlight),
          isVariant: Boolean(params.isVariant),
        },
      },
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
export async function deleteAttribute(name: string) {
  await connection();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const attribute = await Attribute.findOne({ name }).session(session);
      if (!attribute) {
        throw new Error("Attribute not found");
      }

      await Attribute.findByIdAndDelete(attribute._id).session(session);
    });
  } finally {
    session.endSession();
  }
}
