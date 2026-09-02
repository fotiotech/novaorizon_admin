"use server";

import { connection } from "@/utils/connection";
import Attribute from "@/models/Attribute";
import AttributeGroup from "@/models/AttributeGroup";
import CategoryProperty from "@/models/CategoryProperty";
import mongoose, { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import "@/models/UnitFamily";

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

function normalizeUnitFamilyId(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    return mongoose.Types.ObjectId.isValid(value) ? value : null;
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }
  if (typeof value === "object" && value._id) {
    return normalizeUnitFamilyId(value._id);
  }
  return null;
}

export async function findAttributesAndValues(id?: string) {
  try {
    await connection();

    const query = id
      ? Attribute.findById(id)
      : Attribute.find().sort({ sortOrder: 1, name: 1 });
    const docs = await query.lean();
    const items = Array.isArray(docs) ? docs : docs ? [docs] : [];

    const validIds = Array.from(
      new Set(
        items
          .map((item) => normalizeUnitFamilyId(item.unitFamily))
          .filter((unitFamilyId): unitFamilyId is string =>
            Boolean(unitFamilyId),
          ),
      ),
    );

    const unitFamilies = validIds.length
      ? (await mongoose.models.UnitFamily?.find)
        ? await mongoose.models.UnitFamily.find({
            _id: {
              $in: validIds.map(
                (unitId) => new mongoose.Types.ObjectId(unitId),
              ),
            },
          })
            .select("_id name")
            .lean()
        : []
      : [];

    const unitFamilyMap = new Map(
      (unitFamilies as any[]).map((unitFamily) => [
        unitFamily._id.toString(),
        unitFamily,
      ]),
    );

    const response = items.map((item) => {
      const normalizedItem = { ...item };
      const unitFamilyId = normalizeUnitFamilyId(normalizedItem.unitFamily);
      normalizedItem.unitFamily = unitFamilyId
        ? (unitFamilyMap.get(unitFamilyId) ?? null)
        : null;
      return normalizedItem;
    });

    if (id && response.length === 0) return null;
    return id ? response[0] : response;
  } catch (error) {
    console.error("Error in findAttributesAndValues:", error);
    throw new Error("Failed to fetch attributes");
  }
}

// createAttribute – handle empty unitFamily safely
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
      let unitFamilyId = null;
      if (unitFamilies[i] && unitFamilies[i].trim().length > 0) {
        unitFamilyId = new Types.ObjectId(unitFamilies[i].trim());
      }
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
          unitFamily: unitFamilyId,
          isRequired: attrIsRequired,
          option: optionsArr,
          type: attrType,
          sortOrder: attrSortOrder,
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
  _id: string,
  params: AttributeUpdateParams,
) {
  await connection();

  try {
    let optionsArr: string[] = [];

    // Handle option normalization
    if (params.option !== undefined) {
      optionsArr = params.option.map((o) => o.trim()).filter(Boolean);
    }

    // Handle unitFamily conversion only if it's a non-empty string
    let unitFamilyId = null;
    if (params.unitFamily && params.unitFamily.trim().length > 0) {
      unitFamilyId = new Types.ObjectId(params.unitFamily.trim());
    }

    const updateData = {
      code: params.code.trim(),
      unitFamily: unitFamilyId, // Use the conditionally set value
      name: params.name.trim(),
      isRequired: params.isRequired,
      option: optionsArr,
      type: params.type.trim(),
      sort_order: params.sort_order,
    };

    const updated = await Attribute.findByIdAndUpdate(
      _id,
      { $set: updateData },
      { new: true },
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

// deleteAttribute – now accepts _id
export async function deleteAttribute(id: string) {
  await connection();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const attribute = await Attribute.findById(id).session(session);
      if (!attribute) throw new Error("Attribute not found");

      await AttributeGroup.updateMany(
        {},
        { $pull: { attributes: { id: new mongoose.Types.ObjectId(id) } } },
        { session },
      );

      const categoryProperties = await CategoryProperty.find({}).session(
        session,
      );
      for (const property of categoryProperties) {
        let changed = false;
        property.mappings = (property.mappings || []).map((mapping: any) => ({
          ...mapping,
          groups: (mapping.groups || []).map((group: any) => ({
            ...group,
            attributes: (group.attributes || []).filter((entry: any) => {
              const attributeId =
                entry.attribute?.toString?.() ?? entry.attribute;
              const matches = attributeId === id;
              if (matches) changed = true;
              return !matches;
            }),
          })),
        }));

        if (changed) {
          await property.save({ session });
        }
      }

      await Attribute.findByIdAndDelete(id).session(session);
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
