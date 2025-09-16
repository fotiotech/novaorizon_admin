"use server";

import { connection } from "@/utils/connection";
import Attribute from "@/models/Attribute";
import mongoose, { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";

// Add TypeScript interfaces
interface AttributeFormData {
  codes: string[];
  unitFamilies: string[];
  names: string[];
  isRequired: boolean[];
  sort_orders: number[];
  option?: string[][];
  type: string[];
}

interface AttributeUpdateParams {
  code: string;
  unitFamily: string;
  name: string;
  isRequired: boolean;
  sort_order: number;
  option?: string[];
  type: string;
}

// Function to fetch category attributes and values
export async function findAttributesAndValues(id?: string) {
  try {
    await connection();

    let query = id ? Attribute.findOne({ _id: id }) : Attribute.find();
    const response = await query.lean();

    return response;
  } catch (error) {
    console.error("Error in findAttributesAndValues:", error);
    throw new Error("Failed to fetch attributes");
  }
}

export async function createAttribute(formData: AttributeFormData) {
  const { codes, unitFamilies, names, isRequired, sort_orders, option, type } =
    formData;

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
      const rawUnitFamily = new Types.ObjectId(unitFamilies[i] || "");

      if (!rawCode) throw new Error(`Invalid attribute code at idx ${i}`);
      if (!rawName) throw new Error(`Invalid attribute name at idx ${i}`);

      const optionsArr = (option?.[i] || [])
        .map((o: string) => o.trim())
        .filter(Boolean);
      const attrType = (type[i] || "text").trim();
      const attrIsRequired = Boolean(isRequired[i]);
      const attrSortOrder = sort_orders[i] || 0;

      const filter = { code: rawCode };
      const update = {
        $set: {
          name: rawName,
          unitFamily: rawUnitFamily,
          isRequired: attrIsRequired,
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
    return { success: true, attributes };
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
      optionsArr = params.option.map((o) => o.trim()).filter(Boolean);
    }

    const updateData = {
      code: params.code.trim(),
      unitFamily: new Types.ObjectId(params.unitFamily),
      name: params.name.trim(),
      isRequired: params.isRequired,
      option: optionsArr,
      type: params.type.trim(),
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
    return { success: true, attribute: updated };
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

    revalidatePath("/admin/attributes");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteAttribute:", error);
    throw new Error("Failed to delete attribute");
  } finally {
    await session.endSession();
  }
}
