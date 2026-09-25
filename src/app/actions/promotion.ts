// app/actions/promotion.ts
"use server";

import Promotion from "@/models/Promotion";
import PromotionUsage from "@/models/PromotionUsage";
import CustomerGroup from "@/models/CustomerGroup";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { CALC_FIELDS } from "@/app/lib/validation/calc-fields";

async function ensureConnection() {
  await connection();
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/** Snapshot of the field definitions for a calculation type. Stored on
 *  each promotion so future changes to CALC_FIELDS don't retroactively
 *  alter existing promotions. */
function buildPropertySnapshot(calculationType: string) {
  const defs = CALC_FIELDS[calculationType] ?? [];
  return defs.map((d, i) => ({
    code: d.code,
    name: d.name,
    type: d.type,
    isRequired: d.isRequired ?? false,
    options: d.options ?? [],
    defaultValue: d.defaultValue,
    validation: d.validation,
    sortOrder: i,
  }));
}

// ─────────────────────────────────────────────────────────────────────
// Options for the composer
// ─────────────────────────────────────────────────────────────────────
export async function getPromotionOptions() {
  await ensureConnection();

  const [customerGroups, promotions] = await Promise.all([
    CustomerGroup.find().lean(),
    Promotion.find().select("name _id").sort({ createdAt: -1 }).lean(),
  ]);

  return {
    customerGroups: customerGroups.map((g: any) => ({
      label: g.name,
      value: g._id.toString(),
    })),
    promotions: promotions.map((p: any) => ({
      label: p.name,
      value: p._id.toString(),
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────
export async function createPromotion(data: any) {
  await ensureConnection();

  if (!data.calculationType) {
    throw new Error("Calculation type is required");
  }

  const promotionType = {
    name: data.name, // mirrors the promotion name; harmless duplicate
    code: data.code || undefined,
    description: data.description,
    calculationType: data.calculationType,
    properties: buildPropertySnapshot(data.calculationType),
    isActive: true,
  };

  const payload = {
    name: data.name,
    description: data.description,
    code: data.code?.trim().toUpperCase() || undefined,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    isActive: data.isActive ?? true,
    priority: data.priority ?? 0,
    promotionType,
    propertyValues: new Map(
      Object.entries(data.propertyValues ?? {}).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    ),
    customerEligibility: {
      allCustomers: data.customerEligibility?.allCustomers ?? true,
      customerGroupIds: data.customerEligibility?.customerGroupIds ?? [],
      minOrderAmount: data.customerEligibility?.minOrderAmount ?? 0,
    },
    usageLimits: {
      totalUses: data.usageLimits?.totalUses ?? null,
      perCustomer: data.usageLimits?.perCustomer ?? null,
      perOrder: data.usageLimits?.perOrder ?? 1,
    },
    stackable: data.stackable ?? false,
    exclusiveWith: data.exclusiveWith ?? [],
  };

  try {
    const promotion = await Promotion.create(payload);
    revalidatePath("/marketing/promotions");
    return promotion.toObject();
  } catch (err: any) {
    if (err.code === 11000) {
      throw new Error("A promotion with this code already exists");
    }
    throw new Error(`Failed to create promotion: ${err.message}`);
  }
}

export async function updatePromotion(id: string, data: any) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error(`Invalid promotion ID: ${id}`);
  }

  const existing: any = await Promotion.findById(id).lean();
  if (!existing) throw new Error("Promotion not found");

  // If the calculation type changed, snapshot the new field set.
  // Otherwise keep the existing property definitions so we don't
  // silently rewrite history.
  const calculationType =
    data.calculationType ?? existing.promotionType?.calculationType;
  const typeChanged =
    data.calculationType &&
    data.calculationType !== existing.promotionType?.calculationType;

  const promotionType = typeChanged
    ? {
        name: data.name ?? existing.name,
        code: data.code ?? existing.code,
        description: data.description ?? existing.promotionType?.description,
        calculationType,
        properties: buildPropertySnapshot(calculationType),
        isActive: true,
      }
    : {
        ...existing.promotionType,
        name: data.name ?? existing.promotionType?.name,
      };

  const update: any = {
    name: data.name ?? existing.name,
    description: data.description ?? existing.description,
    startDate: data.startDate ? new Date(data.startDate) : existing.startDate,
    endDate: data.endDate ? new Date(data.endDate) : existing.endDate,
    isActive: data.isActive ?? existing.isActive,
    priority: data.priority ?? existing.priority,
    promotionType,
    customerEligibility:
      data.customerEligibility ?? existing.customerEligibility,
    usageLimits: data.usageLimits ?? existing.usageLimits,
    stackable: data.stackable ?? existing.stackable,
    exclusiveWith: data.exclusiveWith ?? existing.exclusiveWith,
  };

  if (data.code !== undefined) {
    update.code = data.code ? data.code.trim().toUpperCase() : null;
  }

  if (data.propertyValues !== undefined) {
    update.propertyValues = new Map(
      Object.entries(data.propertyValues).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );
  }

  try {
    const updated = await Promotion.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    revalidatePath("/marketing/promotions");
    revalidatePath(`/marketing/promotions/edit/${id}`);
    return updated;
  } catch (err: any) {
    if (err.code === 11000) {
      throw new Error("A promotion with this code already exists");
    }
    throw new Error(`Failed to update promotion: ${err.message}`);
  }
}

export async function deletePromotion(id: string) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error("Invalid promotion ID");
  }

  // Block deletion if the promotion has been redeemed — preserve the
  // audit trail.
  const usageCount = await PromotionUsage.countDocuments({
    promotionId: id,
  });
  if (usageCount > 0) {
    throw new Error(
      `Cannot delete: this promotion has been redeemed ${usageCount} time(s). Deactivate it instead.`,
    );
  }

  const result = await Promotion.findByIdAndDelete(id).lean();
  if (!result) throw new Error("Promotion not found");

  revalidatePath("/marketing/promotions");
  return { success: true };
}

export async function getPromotion(id: string) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error(`Invalid promotion ID: ${id}`);
  }

  const promotion = await Promotion.findById(id)
    .populate("customerEligibility.customerGroupIds")
    .populate("exclusiveWith")
    .lean();

  return promotion;
}

export async function listPromotions(
  filter: any = {},
  options: { limit?: number; skip?: number; sort?: any } = {},
) {
  await ensureConnection();

  const { limit = 20, skip = 0, sort = { createdAt: -1 } } = options;

  const [data, total] = await Promise.all([
    Promotion.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Promotion.countDocuments(filter),
  ]);

  return { data, total, limit, skip };
}
