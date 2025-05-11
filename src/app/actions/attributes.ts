"use server";

import Attribute from "@/models/Attributes";
import AttributeValue from "@/models/AttributeValue";
import Category from "@/models/Category";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";

// Add TypeScript interfaces
interface AttributeFormData {
  catId: string;
  groupName: string;
  names: string[];
  values: string[][];
  isVariants: boolean[];
}

interface AttributeUpdateParams {
  name: string;
  group: string;
  category_id?: string;
  isVariant: boolean;
}

// Cache map for category attributes
const categoryAttributesCache = new Map<string, any>();

// Function to fetch only variant attributes and their values
export async function findCategoryVariantAttributes(categoryId: string) {
  await connection();

  // Check cache first with a variant-specific key
  const cacheKey = `variant-${categoryId}`;
  const cached = categoryAttributesCache.get(cacheKey);
  if (cached) {
    const cacheAge = Date.now() - cached.timestamp;
    if (cacheAge < 30000) {
      // Cache valid for 30 seconds
      return cached.data;
    }
  }

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

    // Filter to only include variant attributes
    {
      $addFields: {
        allAttributes: {
          $filter: {
            input: "$allAttributes",
            as: "attr",
            cond: { $eq: ["$$attr.isVariant", true] },
          },
        },
      },
    },

    // Continue with the existing pipeline but only for variant attributes
    { $unwind: "$allAttributes" },
    {
      $lookup: {
        from: "attributevalues",
        localField: "allAttributes._id",
        foreignField: "attribute_id",
        as: "allAttributes.attributeValues",
      },
    },

    // Group attributes by their groups
    {
      $group: {
        _id: {
          categoryId: "$_id",
          groupName: "$allAttributes.group",
        },
        categoryName: { $first: "$name" },
        attributes: {
          $push: {
            id: "$allAttributes._id",
            name: "$allAttributes.name",
            values: "$allAttributes.attributeValues",
            isVariant: true,
          },
        },
      },
    },

    // Final grouping to structure the response
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

    // Clean up the output format
    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        categoryName: 1,
        groupedAttributes: {
          $map: {
            input: "$groupedAttributes",
            as: "group",
            in: {
              groupName: "$$group.groupName",
              attributes: {
                $map: {
                  input: "$$group.attributes",
                  as: "attr",
                  in: {
                    id: "$$attr.id",
                    name: "$$attr.name",
                    values: {
                      $map: {
                        input: "$$attr.values",
                        as: "val",
                        in: {
                          id: "$$val._id",
                          value: "$$val.value",
                        },
                      },
                    },
                    isVariant: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  ]);

  // Update cache
  categoryAttributesCache.set(cacheKey, {
    data: response,
    timestamp: Date.now(),
  });

  return response;
}

// Function to fetch category attributes and values
export async function findCategoryAttributesAndValues(
  categoryId: string,
  variantsOnly: boolean = false
) {
  if (variantsOnly) {
    return findCategoryVariantAttributes(categoryId);
  }

  await connection();

  // Check cache first
  const cached = categoryAttributesCache.get(categoryId);
  if (cached) {
    const cacheAge = Date.now() - cached.timestamp;
    if (cacheAge < 30000) {
      // Cache valid for 30 seconds
      return cached.data;
    }
  }

  const response = await Category.aggregate([
    // Similar pipeline as findCategoryVariantAttributes but without variant filtering
    { $match: { _id: new mongoose.Types.ObjectId(categoryId) } },
    {
      $lookup: {
        from: "attributes",
        localField: "_id",
        foreignField: "category_id",
        as: "directAttributes",
      },
    },
    {
      $graphLookup: {
        from: "categories",
        startWith: "$parent_id",
        connectFromField: "parent_id",
        connectToField: "_id",
        as: "ancestry",
      },
    },
    {
      $lookup: {
        from: "attributes",
        localField: "ancestry._id",
        foreignField: "category_id",
        as: "inheritedAttributes",
      },
    },
    {
      $addFields: {
        allAttributes: {
          $concatArrays: ["$directAttributes", "$inheritedAttributes"],
        },
      },
    },
    { $unwind: "$allAttributes" },
    {
      $lookup: {
        from: "attributevalues",
        localField: "allAttributes._id",
        foreignField: "attribute_id",
        as: "allAttributes.attributeValues",
      },
    },
    {
      $group: {
        _id: {
          categoryId: "$_id",
          groupName: "$allAttributes.group",
        },
        categoryName: { $first: "$name" },
        attributes: {
          $push: {
            id: "$allAttributes._id",
            name: "$allAttributes.name",
            values: "$allAttributes.attributeValues",
            isVariant: "$allAttributes.isVariant",
          },
        },
      },
    },
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
    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        categoryName: 1,
        groupedAttributes: 1,
      },
    },
  ]);

  // Update cache
  categoryAttributesCache.set(categoryId, {
    data: response,
    timestamp: Date.now(),
  });

  return response;
}

// Function to create new attributes
export async function createAttribute(formData: AttributeFormData) {
  const { catId, groupName, names, values, isVariants } = formData;

  if (!catId || !groupName || !Array.isArray(names) || names.length === 0) {
    throw new Error("Missing required fields");
  }

  await connection();
  const session = await mongoose.startSession();

  try {
    const createdAttributes = await session.withTransaction(async () => {
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
            group: groupName,
            name: name.trim(),
            category_id: new mongoose.Types.ObjectId(catId),
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

        // Process values sequentially
        const attributeValues = values[i] || [];
        for (const value of attributeValues) {
          if (value && value.trim()) {
            try {
              await AttributeValue.create(
                [
                  {
                    attribute_id: attribute._id,
                    value: value.trim(),
                  },
                ],
                { session }
              );
            } catch (valueError) {
              console.error(
                `Error creating value "${value}" for attribute "${name}":`,
                valueError
              );
              throw new Error(
                `Failed to create value "${value}" for attribute "${name}"`
              );
            }
          }
        }

        attributes.push(attribute);
      }

      // Clear cache for this category
      categoryAttributesCache.delete(catId);
      categoryAttributesCache.delete(`variant-${catId}`);

      return attributes;
    });

    return createdAttributes;
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
          group: params.group,
          ...(params.category_id && {
            category_id: new mongoose.Types.ObjectId(params.category_id),
          }),
          isVariant: params.isVariant,
        },
        { new: true, session }
      );

      if (!updatedAttribute) {
        throw new Error("Attribute not found");
      }

      // Clear cache for the affected category
      if (params.category_id) {
        categoryAttributesCache.delete(params.category_id);
        categoryAttributesCache.delete(`variant-${params.category_id}`);
      }

      return updatedAttribute;
    });
  } finally {
    session.endSession();
  }
}

// Function to update attribute value
export async function updateAttributeValue(id: string, params: any) {
  await connection();

  try {
    if (params.action === "addValue") {
      // Handle adding a new value
      const attribute = await Attribute.findById(id);
      if (!attribute) {
        throw new Error("Attribute not found");
      }

      const newAttributeValue = await AttributeValue.create({
        attribute_id: attribute._id,
        value: params.value,
      });

      // Clear cache for the affected category
      categoryAttributesCache.delete(attribute.category_id.toString());
      categoryAttributesCache.delete(
        `variant-${attribute.category_id.toString()}`
      );

      return newAttributeValue;
    } else {
      // Handle updating existing value
      const { value } = params;
      const attributeValue = await AttributeValue.findById(id);
      if (!attributeValue) {
        throw new Error("Attribute value not found");
      }

      const updatedAttributeValue = await AttributeValue.findByIdAndUpdate(
        id,
        { value },
        { new: true }
      );

      // Clear cache for the affected category
      const attribute = await Attribute.findById(attributeValue.attribute_id);
      if (attribute) {
        categoryAttributesCache.delete(attribute.category_id.toString());
        categoryAttributesCache.delete(
          `variant-${attribute.category_id.toString()}`
        );
      }

      return updatedAttributeValue;
    }
  } catch (error) {
    console.error("Error updating attribute value:", error);
    throw error;
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

      // Delete all associated values
      await AttributeValue.deleteMany(
        { attribute_id: attribute._id },
        { session }
      );

      await Attribute.findByIdAndDelete(attribute._id).session(session);

      // Clear cache for the affected category
      if (attribute.category_id) {
        categoryAttributesCache.delete(attribute.category_id.toString());
        categoryAttributesCache.delete(
          `variant-${attribute.category_id.toString()}`
        );
      }
    });
  } finally {
    session.endSession();
  }
}

// Function to delete attribute value
export async function deleteAttributeValue(id: string) {
  await connection();

  try {
    const attributeValue = await AttributeValue.findById(id);
    if (!attributeValue) {
      throw new Error("Attribute value not found");
    }

    await AttributeValue.findByIdAndDelete(id);

    // Clear cache for the affected category
    const attribute = await Attribute.findById(attributeValue.attribute_id);
    if (attribute) {
      categoryAttributesCache.delete(attribute.category_id.toString());
      categoryAttributesCache.delete(
        `variant-${attribute.category_id.toString()}`
      );
    }

    return { message: "Attribute value deleted successfully" };
  } catch (error) {
    console.error("Error deleting attribute value:", error);
    throw error;
  }
}
