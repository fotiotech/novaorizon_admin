"use server";

import Attribute from "@/models/Attributes";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// Add TypeScript interfaces
interface AttributeFormData {
  groupId: string;
  names: string[];
  type: string[];
  isVariants: boolean[];
}

interface AttributeUpdateParams {
  name: string;
  type: string;
  groupId: string;
  isVariant: boolean;
}

// Function to fetch category attributes and values
export async function findAttributesAndValues(id?: string) {
  await connection();

  // Build the base query—either find() or findOne({_id: id})
  let query = id
    ? Attribute.findOne({ _id: id })
    : Attribute.find();

  // Populate only `groupId` and select specific fields, then return plain objects
  const response = await query
    .populate("groupId", "name group_order sort_order")
    .lean();

  console.log("Response from findAttributesAndValues:", response);
  return response;
}


// Function to create new attributes
export async function createAttribute(formData: AttributeFormData) {
  const { groupId, names, type, isVariants } = formData;

  console.log("Creating attributes with formData:", formData);

  if (!groupId || !Array.isArray(names) || names.length === 0) {
    throw new Error("Missing required fields");
  }

  await connection();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const attributes = [];

      // Process attributes sequentially
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        if (!name.trim()) {
          throw new Error(`Invalid attribute name at index ${i}`);
        }

        // Create or update the attribute
        const attribute = await Attribute.findOneAndUpdate(
          {
            groupId,
            name: name.trim(),
            type: type || "text", // Default to "text" if type is not provided
          },
          {
            $set: {
              isVariant: isVariants[i] || false,
            },
          },
          {
            upsert: true,
            new: true,
            session,
          }
        );

        

        attributes.push(attribute);
      }

      revalidatePath("/admin/attributes");
    });
  } catch (error) {
    console.error("Error in createAttribute:", error);
    throw new Error("Failed to create attributes: " + (error as Error).message);
  } finally {
    await session.endSession();
  }
}

// Function to update attribute
export async function updateAttribute(
  id: string,
  params: AttributeUpdateParams
) {
  await connection();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const updatedAttribute = await Attribute.findByIdAndUpdate(
        id,
        {
          name: params.name,
          type: params.type,
          groupId: params.groupId.toString(),
          isVariant: params.isVariant,
        },
        { new: true, session }
      );

      if (!updatedAttribute) {
        throw new Error("Attribute not found");
      }

      revalidatePath("/admin/attributes");
    });
  } finally {
    session.endSession();
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

