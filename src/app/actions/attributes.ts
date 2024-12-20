"use server";

import Attribute from "@/models/Attributes";
import AttributeValue from "@/models/AttributeValue";
import Category from "@/models/Category";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";




// Function to fetch category attributes and values
export async function findCategoryAttributesAndValues(categoryId: string) {
  await connection();

  const response = await Category.aggregate([
    // Match the specified category by _id
    { $match: { _id: new mongoose.Types.ObjectId(categoryId) } },

    // Lookup attributes directly associated with the selected category
    {
      $lookup: {
        from: "attributes",
        localField: "_id",
        foreignField: "category_id",
        as: "directAttributes",
      },
    },

    // Use $graphLookup to find the entire category hierarchy
    {
      $graphLookup: {
        from: "categories",
        startWith: "$parent_id",
        connectFromField: "parent_id",
        connectToField: "_id",
        as: "ancestry",
      },
    },

    // Lookup attributes within the ancestry hierarchy
    {
      $lookup: {
        from: "attributes",
        localField: "ancestry._id",
        foreignField: "category_id",
        as: "inheritedAttributes",
      },
    },

    // Merge direct and inherited attributes
    {
      $addFields: {
        allAttributes: {
          $concatArrays: ["$directAttributes", "$inheritedAttributes"],
        },
      },
    },

    // Unwind allAttributes to fetch attribute values per attribute
    { $unwind: "$allAttributes" },

    // Lookup attribute values for each attribute
    {
      $lookup: {
        from: "attributevalues",
        localField: "allAttributes._id",
        foreignField: "attribute_id",
        as: "allAttributes.attributeValues",
      },
    },

    // Group attributes by the 'group' field to organize by attribute groups
    {
      $group: {
        _id: {
          categoryId: "$_id",
          groupName: "$allAttributes.group",
        },
        categoryName: { $first: "$categoryName" },
        attributes: {
          $push: {
            attributeId: "$allAttributes._id",
            attributeName: "$allAttributes.name",
            attributeValues: "$allAttributes.attributeValues",
          },
        },
      },
    },

    // Group again to combine all groups under the category
    {
      $group: {
        _id: "$_id.categoryId",
        categoryName: { $first: "$categoryName" },
        groupedAttributes: {
          $push: {
            groupName: "$_id.groupName",
            attributes: "$attributes",
          },
        },
      },
    },

    // Project the final format
    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        categoryName: 1,
        groupedAttributes: 1,
      },
    },
  ]);

  return response;
}

// Function to create or update attributes and their values
export async function createAttribute(formData: FormData) {
  await connection();

  const categoryId = formData.get("catId") as string;
  const groupName = formData.get("groupName") as string; // Group name
  const attrNames: string[] = [];
  const attrValues: string[][] = []; // Array of arrays to hold multiple values per attribute

  // Collect attribute names and values
  for (const [key, value] of formData.entries() as unknown as any) {
    if (key.startsWith("attrName")) {
      attrNames.push(value as string);
    } else if (key.startsWith("attrValue")) {
      const values = (value as string)
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v); // Filter out empty values
      attrValues.push(values);
    }
  }

  if (!categoryId || !groupName || !attrNames.length || !attrValues.length) {
    console.error("Missing required data:", {
      categoryId,
      groupName,
      attrNames,
      attrValues,
    });
    return;
  }

  try {
    for (let i = 0; i < attrNames.length; i++) {
      const attributeName = attrNames[i];
      const attributeValues = attrValues[i];

      // Check if the attribute already exists
      let attribute = await Attribute.findOne({
        group: groupName,
        name: attributeName,
        category_id: new mongoose.Types.ObjectId(categoryId),
      });

      if (!attribute) {
        // Create a new attribute if it doesn't exist
        attribute = await Attribute.create({
          group: groupName,
          name: attributeName,
          category_id: new mongoose.Types.ObjectId(categoryId),
        });
      }

      // Add or update attribute values in the AttributeValue collection
      for (const value of attributeValues) {
        const existingValue = await AttributeValue.findOne({
          attribute_id: attribute._id,
          value,
        });

        if (!existingValue) {
          // Create a new attribute value if it doesn't exist
          await AttributeValue.create({
            attribute_id: attribute._id,
            value,
          });
        }
      }
    }

    console.log("Attributes and their values successfully created or updated");
  } catch (error) {
    console.error("Error creating or updating attributes and values:", error);
  }
}
