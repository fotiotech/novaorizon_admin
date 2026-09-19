"use server";

import { connection } from "@/utils/connection";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import mongoose from "mongoose";
import Product from "@/models/Product";
import "@/models/Brand";
import Category from "@/models/Category";
import "@/models/Attribute";
import "@/models/User";
import { getCategoryAttributeSets } from "@/app/actions/category";
import { safeValidateProductCreateOrUpdate } from "@/app/lib/products/product.schema";
import { saveProductDraft } from "@/app/actions/drafts";
import { ref, deleteObject } from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";
import { NEW_PRODUCT_DRAFT_KEY } from "../lib/products/draftKeys";

// ---------- Types ----------
export interface ProductListParams {
  q?: string;
  categoryId?: string;
  status?: "draft" | "active" | "inactive" | "";
  page?: number;
  pageSize?: number;
  sort?: "createdAt" | "name" | "price";
  sortDir?: "asc" | "desc";
}
export interface ProductListResult {
  products: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}
interface ProductResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const LIST_UNAUTHORIZED: ProductListResult = {
  products: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
};

/**
 * Field embedded in a staged draft to mark it as a "recreate" of an
 * existing product. When `createProduct` sees it, it deletes that
 * source product *before* saving the new one — so unique fields
 * (slug, sku, …) are freed up for the insert.
 */
const RECREATE_SOURCE_FIELD = "_recreateSourceId";

const HEX_24 = /^[a-f0-9]{24}$/i;

// ---------- Helpers ----------
function toObjectId(value: any): mongoose.Types.ObjectId | null {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
}

function coerceRef(value: any): mongoose.Types.ObjectId | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value === "string") {
    const t = value.trim();
    if (!HEX_24.test(t)) return null;
    return toObjectId(t);
  }

  if (
    value instanceof mongoose.Types.ObjectId ||
    value?._bsontype === "ObjectId" ||
    typeof value?.toHexString === "function"
  ) {
    try {
      const hex = value.toHexString();
      return HEX_24.test(hex) ? new mongoose.Types.ObjectId(hex) : null;
    } catch {
      return null;
    }
  }

  if (value?._id !== undefined && value?._id !== null) {
    return coerceRef(value._id);
  }

  return null;
}

function preSanitizeRefs<T extends Record<string, any>>(input: T): T {
  if (!input || typeof input !== "object") return input;
  const out: any = { ...input };
  for (const key of ["brand", "categoryId", "carrier"]) {
    if (key in out) {
      const coerced = coerceRef(out[key]);
      if (coerced instanceof mongoose.Types.ObjectId) {
        out[key] = coerced.toString();
      } else if (coerced === null) {
        out[key] = null;
      } else {
        out[key] = undefined;
      }
    }
  }
  return out;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generateSlug(name: string, department?: string | null): string {
  return slugify(`${name}${department ? `-${department}` : ""}`, {
    lower: true,
  });
}

function normalizeStatus(status: unknown): "draft" | "active" | "inactive" {
  const s = String(status ?? "draft").toLowerCase();
  if (s === "active" || s === "inactive" || s === "draft") return s as any;
  return "draft";
}

function sanitizeProductCode(
  code: any,
): { type: string; value: string } | null {
  if (code === undefined || code === null) return null;
  let raw = code;
  for (let i = 0; i < 5 && Array.isArray(raw); i++) {
    raw = raw[0];
  }
  if (!raw || typeof raw !== "object") return null;
  const type = raw.type || "";
  const value = raw.value || "";
  if (!type || !value) return null;
  return { type: String(type), value: String(value) };
}

function normalizeVariantValuesMap(
  data: any,
): Record<string, string[]> | undefined {
  if (!data) return undefined;

  const normalizeKey = (k: string) =>
    k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

  const absorbObject = (obj: Record<string, any>) => {
    const out: Record<string, string[]> = {};
    Object.entries(obj).forEach(([k, v]) => {
      const key = normalizeKey(k);
      if (!key) return;
      out[key] = Array.isArray(v)
        ? v.filter((x): x is string => typeof x === "string")
        : v !== undefined && v !== null
          ? [String(v)]
          : [];
    });
    return out;
  };

  if (Array.isArray(data)) {
    const isKvArray =
      data.length > 0 &&
      data.every((x) => x && typeof x === "object" && "k" in x && "v" in x);
    if (isKvArray) {
      const out: Record<string, string[]> = {};
      data.forEach((item: any) => {
        const key = normalizeKey(item.k);
        if (!key) return;
        out[key] = Array.isArray(item.v) ? item.v : [item.v];
      });
      return out;
    }
    if (data.length === 1 && data[0] && typeof data[0] === "object") {
      return absorbObject(data[0]);
    }
    return undefined;
  }

  if (typeof data === "object") return absorbObject(data);
  return undefined;
}

function serialize(doc: any): any {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return JSON.parse(JSON.stringify(obj));
}

// ==================================================================
// Category attribute info
//
// Walks the category's attribute sets once and derives:
//   - requiredCodes      → attribute codes with `isRequired: true`
//   - variantThemeCodes  → attribute codes inside the `variantThemes` group
//   - variantFieldCodes  → attribute codes inside the `variantFields` group
//
// Variant membership is driven by the group an attribute lives in,
// not a per-attribute flag. Group codes are normalised so `variant_themes`
// and `variantThemes` are treated identically.
// ==================================================================

const normalizeKey = (k: string) =>
  k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

interface CategoryAttributeInfo {
  requiredCodes: string[];
  variantThemeCodes: Set<string>; // normalized camelCase
  variantFieldCodes: Set<string>; // normalized camelCase
}

async function getCategoryAttributeInfo(
  categoryId: string,
): Promise<CategoryAttributeInfo> {
  const attributeSets = await getCategoryAttributeSets(categoryId);
  const requiredCodes: string[] = [];
  const variantThemeCodes = new Set<string>();
  const variantFieldCodes = new Set<string>();

  const walk = (groups: any[]) => {
    for (const group of groups ?? []) {
      const groupCode = normalizeKey(String(group.code ?? ""));

      for (const attr of group.attributes ?? []) {
        if (!attr.code) continue;

        if (attr.isRequired) {
          // `sale_price` is opt-in — it's never enforced server-side.
          if (attr.code !== "sale_price" && attr.code !== "salePrice") {
            requiredCodes.push(attr.code);
          }
        }

        // Variant membership is a property of the group the attribute
        // lives in, not a per-attribute flag.
        if (groupCode === "variantThemes") {
          variantThemeCodes.add(normalizeKey(attr.code));
        }
        if (groupCode === "variantFields") {
          variantFieldCodes.add(normalizeKey(attr.code));
        }
      }

      if (group.children?.length) walk(group.children);
    }
  };

  for (const set of attributeSets) walk(set.groups);

  return { requiredCodes, variantThemeCodes, variantFieldCodes };
}

// ==================================================================
// Variant data invariants
//
// A category supports variants iff its attribute sets contain a
// `variantThemes` group with at least one attribute. `hasVariants`
// is only meaningful when that precondition holds. When it does not,
// or when the client asks for variants but supplies no valid theme,
// we force-clear everything to keep DB state consistent.
// ==================================================================

function sanitizeVariantData(
  payload: Record<string, any>,
  categoryVariantThemes: Set<string>,
): void {
  const wantsVariants = payload.hasVariants === true;

  // Rule 1: a category with no variant themes cannot have variants.
  // Rule 2: user explicitly turned variants off.
  if (categoryVariantThemes.size === 0 || !wantsVariants) {
    payload.hasVariants = false;
    payload.variants = [];
    payload.variantThemes = [];
    payload.variantValues = {};
    return;
  }

  // Rule 3: only keep themes the category actually allows.
  const declaredThemes: string[] = Array.isArray(payload.variantThemes)
    ? payload.variantThemes
        .map((c: any) => String(c))
        .filter((c: string) => categoryVariantThemes.has(normalizeKey(c)))
    : [];

  if (declaredThemes.length === 0) {
    // hasVariants was true but nothing valid to split by → downgrade.
    payload.hasVariants = false;
    payload.variants = [];
    payload.variantThemes = [];
    payload.variantValues = {};
    return;
  }

  payload.variantThemes = declaredThemes;

  // Rule 4: every variant must carry a non-empty value for every theme.
  if (Array.isArray(payload.variants)) {
    payload.variants = payload.variants.filter((v: any) => {
      if (!v || typeof v !== "object") return false;
      return declaredThemes.every((theme) => {
        const key = normalizeKey(theme);
        const value = v[key] ?? v[theme];
        return value !== undefined && value !== null && value !== "";
      });
    });
  } else {
    payload.variants = [];
  }

  // Rule 5: variantValues only for declared themes.
  const allowedKeys = new Set(declaredThemes.map(normalizeKey));
  const raw = payload.variantValues;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const filtered: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (allowedKeys.has(normalizeKey(k))) filtered[k] = v;
    }
    payload.variantValues = filtered;
  } else {
    payload.variantValues = {};
  }
}

// ==================================================================
// Legacy: kept around in case other code imports it. Reimplemented
// on top of `getCategoryAttributeInfo`.
// ==================================================================

async function validateRequiredCategoryAttributes(
  categoryId: string,
  data: Record<string, any>,
) {
  if (!categoryId) return;
  const info = await getCategoryAttributeInfo(categoryId);
  const missing: string[] = [];
  for (const code of info.requiredCodes) {
    const camel = normalizeKey(code);
    const value = data[camel];
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0)
    ) {
      missing.push(code);
    }
  }
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
}

function stripRecreateMarker<T extends Record<string, any>>(payload: T): T {
  if (payload && typeof payload === "object") {
    delete (payload as any)[RECREATE_SOURCE_FIELD];
  }
  return payload;
}

/**
 * Delete a product and detach every `relatedProducts` pointer that
 * referenced it. Safe to call with `session` for transactional use.
 */
async function hardDeleteProduct(
  objectId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
): Promise<boolean> {
  await Product.updateMany(
    { "relatedProducts.product": objectId },
    { $pull: { relatedProducts: { product: objectId } } },
    { session },
  );
  const removed = await Product.findByIdAndDelete(objectId, { session });
  return !!removed;
}

// ==================================================================
// SHARED PAYLOAD PREPARATION
// ==================================================================
type PrepareResult =
  | {
      ok: true;
      payload: Record<string, any>;
      providedId: mongoose.Types.ObjectId | null;
    }
  | { ok: false; error: string };

async function prepareProductPayload(formData: any): Promise<PrepareResult> {
  const sanitized = preSanitizeRefs(formData ?? {});

  const validated = safeValidateProductCreateOrUpdate(sanitized);
  if (!validated.success) {
    return { ok: false, error: `Validation failed: ${validated.error}` };
  }

  const data = { ...sanitized, ...(validated.data ?? {}) };

  const providedId = data._id ? toObjectId(data._id) : null;
  if (data._id && !providedId)
    return { ok: false, error: "Invalid product id" };

  const baseData: any = { ...data };
  delete baseData._id;

  const nextCategory = coerceRef(data.categoryId);
  const nextBrand = coerceRef(data.brand);
  const nextCarrier = coerceRef(data.carrier);

  if (
    nextCategory === null &&
    data.categoryId != null &&
    data.categoryId !== ""
  ) {
    return { ok: false, error: "Invalid category" };
  }
  if (nextBrand === null && data.brand != null && data.brand !== "") {
    return { ok: false, error: "Invalid brand" };
  }

  // ---- Category attribute info (required codes + variant groups) ----
  let categoryInfo: CategoryAttributeInfo | null = null;
  if (nextCategory) {
    try {
      categoryInfo = await getCategoryAttributeInfo(nextCategory.toString());
    } catch (e: any) {
      return {
        ok: false,
        error: e?.message || "Failed to load category attributes",
      };
    }

    // Required-field enforcement.
    const missing: string[] = [];
    for (const code of categoryInfo.requiredCodes) {
      const camel = normalizeKey(code);
      const value = data[camel];
      const empty =
        value === undefined ||
        value === null ||
        (typeof value === "string" && !value.trim()) ||
        (Array.isArray(value) && value.length === 0);
      if (empty) missing.push(code);
    }
    if (missing.length) {
      return {
        ok: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      };
    }
  }

  const payload: any = {
    ...baseData,
    status: normalizeStatus(data.status),
    updatedAt: new Date(),
  };

  delete payload.brand;
  delete payload.carrier;
  delete payload.categoryId;
  delete payload[RECREATE_SOURCE_FIELD];

  if (nextCategory !== undefined) payload.categoryId = nextCategory;
  if (nextBrand !== undefined) payload.brand = nextBrand;
  if (nextCarrier !== undefined) payload.carrier = nextCarrier;

  if (data.name) payload.slug = generateSlug(data.name, data.department);

  // productCode → single object or null
  if (data.type && data.value) {
    payload.productCode = { type: data.type, value: data.value };
    delete payload.type;
    delete payload.value;
  } else if (data.productCode !== undefined) {
    payload.productCode = sanitizeProductCode(data.productCode);
  }
  if (payload.productCode !== undefined && payload.productCode !== null) {
    payload.productCode = sanitizeProductCode(payload.productCode);
  }

  if (
    data.relatedProducts !== undefined &&
    Array.isArray(data.relatedProducts)
  ) {
    payload.relatedProducts = data.relatedProducts
      .map((rp: any) => {
        if (!rp) return null;
        const rawId = rp.id ?? rp.product?._id ?? rp.product?.id ?? rp.product;
        const product = toObjectId(rawId);
        if (!product) return null;
        return { product, relationshipType: rp.relationshipType || "" };
      })
      .filter(Boolean);
  }

  if (payload.variantValues !== undefined) {
    const normalized = normalizeVariantValuesMap(payload.variantValues);
    if (normalized) {
      payload.variantValues = normalized;
    } else {
      delete payload.variantValues;
    }
  }

  if (Array.isArray(payload.variantThemes)) {
    payload.variantThemes = payload.variantThemes.map((c: any) =>
      normalizeKey(String(c)),
    );
  }

  if (Array.isArray(payload.variants)) {
    payload.variants = payload.variants.map((v: any) => {
      if (!v || typeof v !== "object") return v;
      const next = { ...v };
      if (Array.isArray(next.mainImage))
        next.mainImage = next.mainImage[0] || "";
      if (Array.isArray(next.images)) next.images = next.images.filter(Boolean);
      Object.keys(next).forEach((key) => {
        const val = next[key];
        if (
          val &&
          typeof val === "object" &&
          "value" in val &&
          Object.keys(val).length <= 2
        ) {
          next[key] = (val as any).value;
        }
      });
      return next;
    });
  }

  delete payload.keyFeatures;
  delete payload.specifications;

  // ---- Server-side variant invariant enforcement --------------------
  // Runs last, on normalized data. No category → no variant themes known
  // → variants are force-disabled.
  sanitizeVariantData(
    payload,
    categoryInfo?.variantThemeCodes ?? new Set<string>(),
  );

  return { ok: true, payload, providedId };
}

// ==================================================================
// SERVER ACTIONS
// ==================================================================

export async function findProductById(id: string): Promise<any> {
  try {
    await connection();
    const product = await Product.findById(id).lean();
    if (!product) return { success: false, error: "Product not found" };
    return serialize(product);
  } catch (error) {
    console.error("Error finding product:", error);
    return { success: false, error: "Failed to fetch product" };
  }
}

// ==================================================================
// FIND PRODUCTS
// ==================================================================

export async function findProducts(
  params: ProductListParams = {},
): Promise<ProductListResult> {
  await connection();

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));
  const skip = (page - 1) * pageSize;

  const sortField: string = params.sort ?? "createdAt";
  const sortDir: 1 | -1 = params.sortDir === "asc" ? 1 : -1;

  // ---- Filter ------------------------------------------------------
  const filter: Record<string, any> = {};

  if (params.status) filter.status = params.status;

  if (params.categoryId && mongoose.Types.ObjectId.isValid(params.categoryId)) {
    filter.categoryId = new mongoose.Types.ObjectId(params.categoryId);
  }

  const q = (params.q ?? "").trim();
  if (q) {
    // $text uses ProductTextIndex. Never fall back to a regex here —
    // that's what forced the COLLSCAN in the old code.
    filter.$text = { $search: q };
  }

  const sort: Record<string, any> = { [sortField]: sortDir };

  // ---- Aggregation pipeline ---------------------------------------
  const pipeline: any[] = [
    { $match: filter },
    { $sort: sort },
    { $skip: skip },
    { $limit: pageSize },

    // categoryId → { _id, name } | null
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "_cat",
      },
    },
    { $unwind: { path: "$_cat", preserveNullAndEmptyArrays: true } },

    // brand → { _id, name } | null  (safe against corrupt refs)
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "_brand",
      },
    },
    { $unwind: { path: "$_brand", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        _id: 1,
        name: 1,
        sku: 1,
        slug: 1,
        images: 1,
        tags: 1,
        status: 1,
        quantity: 1,
        lowStockThreshold: 1,
        listPrice: 1,
        price: 1,
        createdAt: 1,
        categoryId: {
          $cond: [
            { $ifNull: ["$_cat._id", false] },
            { _id: "$_cat._id", name: "$_cat.name" },
            null,
          ],
        },
        brand: {
          $cond: [
            { $ifNull: ["$_brand._id", false] },
            { _id: "$_brand._id", name: "$_brand.name" },
            null,
          ],
        },
      },
    },
  ];

  try {
    const [rows, total] = await Promise.all([
      Product.aggregate(pipeline).exec(),
      Product.countDocuments(filter),
    ]);

    return {
      products: rows.map(serialize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error("Error finding products:", error);
    return {
      ...LIST_UNAUTHORIZED,
      page,
      pageSize,
      error: "Failed to load products",
    };
  }
}

export async function getProductFilterCategories(): Promise<
  { id: string; name: string }[]
> {
  try {
    await connection();
    const rows = await Product.aggregate([
      { $match: { categoryId: { $ne: null } } },
      { $group: { _id: "$categoryId" } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, id: { $toString: "$_id" }, name: "$cat.name" } },
      { $match: { name: { $ne: null } } },
      { $sort: { name: 1 } },
    ]);
    return rows as { id: string; name: string }[];
  } catch (error) {
    console.error("Error fetching filter categories:", error);
    return [];
  }
}

// ==================================================================
// CREATE — deletes the recreate source FIRST, then saves
// ==================================================================

export async function createProduct(formData: any): Promise<ProductResponse> {
  try {
    await connection();

    // Grab the marker BEFORE sanitization strips it.
    const rawSourceId =
      formData && typeof formData === "object"
        ? formData[RECREATE_SOURCE_FIELD]
        : undefined;

    const prepared = await prepareProductPayload(formData);
    if (!prepared.ok) return { success: false, error: prepared.error };

    if (prepared.providedId) {
      return {
        success: false,
        error:
          "Cannot create a product with an existing _id. Use updateProduct instead.",
      };
    }

    const now = new Date();
    const payload = stripRecreateMarker({
      ...prepared.payload,
      createdAt: now,
      updatedAt: now,
    });

    // Resolve the source id, if any.
    let sourceObjectId: mongoose.Types.ObjectId | null = null;
    if (typeof rawSourceId === "string" && HEX_24.test(rawSourceId.trim())) {
      sourceObjectId = new mongoose.Types.ObjectId(rawSourceId.trim());
    }

    // ---- Preferred path: atomic transaction ------------------------
    let usedTransaction = false;
    let deletedSourceId: string | null = null;
    let product: any = null;

    try {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          if (sourceObjectId) {
            await hardDeleteProduct(sourceObjectId, session);
            deletedSourceId = sourceObjectId.toString();
          }
          const doc = new Product(payload);
          product = await doc.save({ session });
        });
        usedTransaction = true;
      } finally {
        await session.endSession();
      }
    } catch (txError: any) {
      // Standalone MongoDB (or any other reason transactions aren't
      // available) — fall through to sequential execution.
      const msg = String(txError?.message ?? "");
      const txUnsupported =
        /Transaction numbers are only allowed/i.test(msg) ||
        /replica set/i.test(msg) ||
        /mongos/i.test(msg) ||
        txError?.codeName === "IllegalOperation" ||
        txError?.code === 20;

      if (!txUnsupported) throw txError;

      console.warn(
        "[createProduct] Transactions unavailable — running sequentially.",
      );
    }

    // ---- Fallback: sequential (delete first, then save) ------------
    if (!usedTransaction) {
      if (sourceObjectId) {
        const removed = await hardDeleteProduct(sourceObjectId);
        if (removed) deletedSourceId = sourceObjectId.toString();
      }
      const doc = new Product(payload);
      product = await doc.save();
    }

    if (!product) {
      return {
        success: false,
        error: "Failed to create product (no document returned)",
      };
    }

    if (deletedSourceId) {
      revalidatePath(`/catalog/products/edit/${deletedSourceId}`);
    }
    revalidatePath("/catalog/products");

    return {
      success: true,
      data: {
        product: serialize(product),
        ...(deletedSourceId ? { deletedSourceId } : {}),
      },
    };
  } catch (error: any) {
    console.error("Error in createProduct:", error);
    return {
      success: false,
      error: error.message || "Failed to create product",
    };
  }
}

export async function updateProduct(
  id: string,
  formData: any,
): Promise<ProductResponse> {
  try {
    await connection();

    if (!id) return { success: false, error: "Product ID required" };
    const objectId = toObjectId(id);
    if (!objectId) return { success: false, error: "Invalid product ID" };

    const prepared = await prepareProductPayload(formData);
    if (!prepared.ok) return { success: false, error: prepared.error };

    const payload = stripRecreateMarker({ ...prepared.payload });
    delete payload.createdAt;
    delete payload._id;
    delete payload.__v;
    payload.updatedAt = new Date();

    if (payload.productCode !== undefined) {
      payload.productCode = sanitizeProductCode(payload.productCode);
    }

    if (payload.brand === undefined) delete payload.brand;
    if (payload.categoryId === undefined) delete payload.categoryId;
    if (payload.carrier === undefined) delete payload.carrier;

    const product = await Product.findByIdAndUpdate(
      objectId,
      {
        $set: payload,
        $unset: { keyFeatures: "", specifications: "" },
      },
      { new: true, runValidators: true },
    );

    if (!product) return { success: false, error: "Product not found" };

    revalidatePath("/catalog/products");
    revalidatePath(`/catalog/products/edit/${id}`);
    return { success: true, data: serialize(product) };
  } catch (error: any) {
    console.error("Error in updateProduct:", error);
    return {
      success: false,
      error: error.message || "Failed to update product",
    };
  }
}

// ==================================================================
// LIGHTWEIGHT CATEGORY-ONLY UPDATE
// ==================================================================
export async function updateProductCategory(
  productId: string,
  categoryId: string | null,
): Promise<ProductResponse> {
  try {
    await connection();
    if (!productId) return { success: false, error: "Product ID required" };

    const pid = toObjectId(productId);
    if (!pid) return { success: false, error: "Invalid product ID" };

    if (!categoryId) {
      return { success: false, error: "Category is required" };
    }
    const nextCategory = toObjectId(categoryId);
    if (!nextCategory) {
      return { success: false, error: "Invalid category ID" };
    }

    const category = await Category.findById(nextCategory).select("_id");
    if (!category) return { success: false, error: "Category not found" };

    const product = await Product.findByIdAndUpdate(
      pid,
      { $set: { categoryId: nextCategory, updatedAt: new Date() } },
      { new: true },
    );
    if (!product) return { success: false, error: "Product not found" };

    revalidatePath("/catalog/products");
    revalidatePath(`/catalog/products/edit/${productId}`);
    return { success: true, data: serialize(product) };
  } catch (error: any) {
    console.error("Error updating product category:", error);
    return {
      success: false,
      error: error.message || "Failed to update category",
    };
  }
}

// ==================================================================
// LIGHTWEIGHT STATUS-ONLY UPDATE
// ==================================================================
export async function updateProductStatus(
  productId: string,
  status: "active" | "inactive" | "draft",
): Promise<ProductResponse> {
  try {
    await connection();
    if (!productId) return { success: false, error: "Product ID required" };

    const pid = toObjectId(productId);
    if (!pid) return { success: false, error: "Invalid product ID" };

    const normalized = String(status ?? "")
      .trim()
      .toLowerCase();
    if (
      normalized !== "active" &&
      normalized !== "inactive" &&
      normalized !== "draft"
    ) {
      return { success: false, error: "Invalid status" };
    }

    const product = await Product.findByIdAndUpdate(
      pid,
      { $set: { status: normalized, updatedAt: new Date() } },
      { new: true },
    );
    if (!product) return { success: false, error: "Product not found" };

    revalidatePath("/catalog/products");
    revalidatePath(`/catalog/products/edit/${productId}`);
    return { success: true, data: serialize(product) };
  } catch (error: any) {
    console.error("Error updating product status:", error);
    return {
      success: false,
      error: error.message || "Failed to update status",
    };
  }
}

// ==================================================================
// RECREATE — stage as draft; deletion happens on save
// ==================================================================

export async function recreateProduct(
  id: string,
  draftKey: string = NEW_PRODUCT_DRAFT_KEY,
): Promise<ProductResponse> {
  try {
    await connection();
    if (!id) return { success: false, error: "Product ID required" };
    if (!draftKey) return { success: false, error: "Draft key required" };

    const objectId = toObjectId(id);
    if (!objectId) return { success: false, error: "Invalid product ID" };

    const original: any = await Product.findById(objectId).lean();
    if (!original) return { success: false, error: "Product not found" };

    // ---- Build a clean draft payload -------------------------------
    const draftData: any = { ...original };

    // Strip identity / server-managed metadata
    delete draftData._id;
    delete draftData.__v;
    delete draftData.createdAt;
    delete draftData.updatedAt;
    delete draftData.keyFeatures;
    delete draftData.specifications;

    // Slug is regenerated by createProduct — drop it here.
    delete draftData.slug;

    // Refs → plain strings (Draft is JSON-only, no casting).
    const brandId = coerceRef(original.brand);
    const categoryId = coerceRef(original.categoryId);
    const carrierId = coerceRef(original.carrier);
    draftData.brand = brandId ? brandId.toString() : "";
    draftData.categoryId = categoryId ? categoryId.toString() : "";
    draftData.carrier = carrierId ? carrierId.toString() : "";

    // productCode → single object or null (never an array)
    draftData.productCode = sanitizeProductCode(original.productCode);

    // relatedProducts → plain string ids for the form
    if (Array.isArray(draftData.relatedProducts)) {
      draftData.relatedProducts = draftData.relatedProducts
        .map((rp: any) => {
          const pid = coerceRef(rp?.product);
          if (!pid) return null;
          return {
            product: pid.toString(),
            relationshipType: rp?.relationshipType || "",
          };
        })
        .filter(Boolean);
    }

    draftData.status = "draft";
    draftData.reviewsRatings = [];

    // 🎯 Marker: source product to delete once the user clicks Save.
    draftData[RECREATE_SOURCE_FIELD] = id;

    // ---- Persist as a Draft under the caller's key -----------------
    const draftResult = await saveProductDraft(draftKey, draftData);
    if (!draftResult.success) {
      return {
        success: false,
        error: draftResult.error || "Failed to stage draft",
      };
    }

    // Original is intentionally NOT deleted here.
    revalidatePath("/catalog/products/new");

    return {
      success: true,
      data: {
        sourceProductId: id, // still alive
        draftKey,
      },
    };
  } catch (error: any) {
    console.error("Error recreating product:", error);
    return {
      success: false,
      error: error.message || "Failed to recreate product",
    };
  }
}

// ==================================================================
// DELETE
// ==================================================================
export async function deleteProduct(id: string): Promise<ProductResponse> {
  try {
    await connection();
    if (!id) return { success: false, error: "Product ID required" };

    const product = await Product.findById(id);
    if (!product) return { success: false, error: "Product not found" };

    await Product.updateMany(
      { "relatedProducts.product": new mongoose.Types.ObjectId(id) },
      {
        $pull: {
          relatedProducts: { product: new mongoose.Types.ObjectId(id) },
        },
      },
    );

    await Product.findByIdAndDelete(id);

    revalidatePath("/catalog/products");
    revalidatePath(`/catalog/products/edit/${id}`);
    return { success: true, data: "Product deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return {
      success: false,
      error: error.message || "Failed to delete product",
    };
  }
}

export async function deleteProductImages(
  productId?: string,
  imageUrl?: string,
): Promise<ProductResponse> {
  try {
    await connection();
    if (!productId && !imageUrl) {
      return { success: false, error: "ProductId or imageUrl required" };
    }

    const deleteFromStorage = async (url: string) => {
      try {
        const urlObj = new URL(url);
        const encoded = urlObj.pathname.split("/").pop();
        if (encoded) {
          const fileName = decodeURIComponent(encoded);
          const path = fileName.startsWith("uploads/")
            ? fileName
            : `uploads/${fileName}`;
          await deleteObject(ref(storage, path));
        }
      } catch (e) {
        console.warn("Failed to delete image from storage:", e);
      }
    };

    if (productId && mongoose.isValidObjectId(productId)) {
      const product = await Product.findById(productId);
      if (!product) return { success: false, error: "Product not found" };
      if (imageUrl) {
        const images = product.images || [];
        if (!images.includes(imageUrl)) {
          return { success: false, error: "Image URL not found in product" };
        }
        await deleteFromStorage(imageUrl);
        product.images = images.filter((u: string) => u !== imageUrl);
        await product.save();
        return { success: true, data: serialize(product) };
      }
      return { success: false, error: "Image URL required" };
    } else if (imageUrl) {
      await deleteFromStorage(imageUrl);
      return { success: true, data: "Image deleted from storage" };
    }
    return { success: false, error: "Invalid parameters" };
  } catch (error: any) {
    console.error("Error deleting product images:", error);
    return {
      success: false,
      error: error.message || "Failed to delete images",
    };
  }
}
