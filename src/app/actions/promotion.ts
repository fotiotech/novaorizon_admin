// app/actions/promotion.ts
"use server";

import Promotion from "@/models/Promotion";
import PromotionUsage from "@/models/PromotionUsage";
import CustomerGroup from "@/models/CustomerGroup";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
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

/** Snapshot of the field definitions for a calculation type. */
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

/** Normalise the scope payload coming from the composer. */
function normalizeScope(scope: any) {
  const appliesTo = scope?.appliesTo ?? "all";
  return {
    appliesTo,
    productIds: appliesTo === "products" ? (scope?.productIds ?? []) : [],
    categoryIds: appliesTo === "categories" ? (scope?.categoryIds ?? []) : [],
    brandIds: appliesTo === "brands" ? (scope?.brandIds ?? []) : [],
    excludeProductIds: scope?.excludeProductIds ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Options for the composer
// ─────────────────────────────────────────────────────────────────────
export async function getPromotionOptions() {
  await ensureConnection();

  const [customerGroups, promotions, products, categories, brands] =
    await Promise.all([
      CustomerGroup.find().lean(),
      Promotion.find().select("name _id").sort({ createdAt: -1 }).lean(),
      Product.find()
        .select("name _id sku price image")
        .sort({ createdAt: -1 })
        .lean(),
      Category.find().select("name _id slug").sort({ name: 1 }).lean(),
      Brand.find().select("name _id url_slug").sort({ name: 1 }).lean(),
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
    products: products.map((p: any) => ({
      value: p._id.toString(),
      label: p.name,
      sku: p.sku ?? undefined,
      price: typeof p.price === "number" ? p.price : undefined,
      image: Array.isArray(p.image) ? p.image[0] : (p.image ?? undefined),
    })),
    categories: categories.map((c: any) => ({
      value: c._id.toString(),
      label: c.name,
      sublabel: c.slug ?? undefined,
    })),
    brands: brands.map((b: any) => ({
      value: b._id.toString(),
      label: b.name,
      sublabel: b.url_slug ?? undefined,
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
    name: data.name,
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
    scope: normalizeScope(data.scope),
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

  if (data.scope !== undefined) {
    update.scope = normalizeScope(data.scope);
  }

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
    .populate("scope.productIds")
    .populate("scope.categoryIds")
    .populate("scope.brandIds")
    .populate("scope.excludeProductIds")
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

// ─────────────────────────────────────────────────────────────────────
// Product-side promotion scope
//
// The promotion owns scope.productIds; the product form is just a
// write-back UI for it. Only "products"-scoped promotions are exposed
// here — adding a product ID to an "all"/"categories"/"brands"
// promotion is a no-op in the resolver, so it shouldn't be selectable.
// ─────────────────────────────────────────────────────────────────────

/** Every product-scoped promotion, active or not — the admin may need
 *  to see and unselect one that was deactivated after being attached. */
export async function getSelectablePromotions() {
  await ensureConnection();

  const promotions = await Promotion.find({
    "scope.appliesTo": "products",
  })
    .select("name code isActive promotionType.calculationType")
    .sort({ createdAt: -1 })
    .lean();

  return promotions.map((p: any) => ({
    value: p._id.toString(),
    label: p.name,
    sublabel: p.code ?? undefined,
    badge: p.promotionType?.calculationType ?? undefined,
    inactive: p.isActive === false,
  }));
}

/** Product-scoped promotions that currently include this product.
 *  Deliberately does NOT filter on isActive so an inactive-but-attached
 *  promotion survives a product save untouched. */
export async function getProductPromotions(
  productId: string,
): Promise<string[]> {
  await ensureConnection();
  if (!isValidObjectId(productId)) return [];

  const promotions = await Promotion.find({
    "scope.appliesTo": "products",
    "scope.productIds": productId,
  })
    .select("_id")
    .lean();

  return promotions.map((p: any) => p._id.toString());
}

/** Reconcile scope.productIds for product-scoped promotions against the
 *  form's selection. Other scopes are untouched. */
export async function syncProductPromotions(
  productId: string,
  promotionIds: string[],
): Promise<{ success: true }> {
  await ensureConnection();
  if (!isValidObjectId(productId)) {
    throw new Error("Invalid product ID");
  }

  const validIds = promotionIds.filter(isValidObjectId);

  // Remove this product from any product-scoped promotion not in the
  // new list.
  await Promotion.updateMany(
    {
      "scope.appliesTo": "products",
      "scope.productIds": productId,
      _id: { $nin: validIds },
    },
    { $pull: { "scope.productIds": productId } },
  );

  // Add to every selected product-scoped promotion that doesn't have
  // it yet.
  if (validIds.length > 0) {
    await Promotion.updateMany(
      {
        _id: { $in: validIds },
        "scope.appliesTo": "products",
        "scope.productIds": { $ne: productId },
      },
      { $addToSet: { "scope.productIds": productId } },
    );
  }

  revalidatePath("/marketing/promotions");
  return { success: true };
}
