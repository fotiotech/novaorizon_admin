"use server";

import { connection } from "@/utils/connection";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import mongoose from "mongoose";
import Product from "@/models/Product";
import Brand from "@/models/Brand";
import Category from "@/models/Category";
import "@/models/Attribute";
import "@/models/User";
import { getCategoryAttributeSets } from "@/app/actions/category";
import { safeValidateProductCreateOrUpdate } from "@/lib/product.schema";
import { ref, deleteObject } from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";

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
}
interface ProductResponse {
  success: boolean;
  data?: any;
  error?: string;
}
interface DeleteProductOptions {
  recreate?: boolean;
}

const LIST_UNAUTHORIZED: ProductListResult = {
  products: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
};

// ---------- Helpers ----------
function toObjectId(value: any): mongoose.Types.ObjectId | null {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
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
  if (!code) return null;
  const raw = Array.isArray(code) ? code[0] : code;
  if (!raw || typeof raw !== "object") return null;
  const type = raw.type || "";
  const value = raw.value || "";
  if (!type || !value) return null;
  return { type, value };
}

/**
 * Accept any historical `variantValues` shape and normalize to a plain map.
 *   1. { [code]: string[] }          (current)
 *   2. [{ k, v }, …]                 (legacy)
 *   3. [ { [code]: string[] } ]      (Mongoose [Mixed] wrapping an object)
 */
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

async function validateRequiredCategoryAttributes(
  categoryId: string,
  data: Record<string, any>,
) {
  if (!categoryId) return;
  const attributeSets = await getCategoryAttributeSets(categoryId);
  const requiredCodes = new Set<string>();
  for (const set of attributeSets) {
    for (const group of set.groups ?? []) {
      for (const attr of group.attributes ?? []) {
        if (attr.isRequired && attr.code) {
          if (attr.code === "sale_price" || attr.code === "salePrice") continue;
          requiredCodes.add(attr.code);
        }
      }
    }
  }
  const missing: string[] = [];
  for (const code of requiredCodes) {
    const camel = code.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
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

// ==================================================================
// SHARED PAYLOAD PREPARATION — MODEL B: everything flat
// ==================================================================
type PrepareResult =
  | {
      ok: true;
      payload: Record<string, any>;
      providedId: mongoose.Types.ObjectId | null;
    }
  | { ok: false; error: string };

async function prepareProductPayload(formData: any): Promise<PrepareResult> {
  const validated = safeValidateProductCreateOrUpdate(formData);
  if (!validated.success) {
    return { ok: false, error: `Validation failed: ${validated.error}` };
  }

  const data = { ...formData, ...(validated.data ?? {}) };

  const providedId = data._id ? toObjectId(data._id) : null;
  if (data._id && !providedId)
    return { ok: false, error: "Invalid product id" };

  const baseData: any = { ...data };
  delete baseData._id;

  // ---- Referenced ids ----
  let categoryId: mongoose.Types.ObjectId | null = null;
  let brand: mongoose.Types.ObjectId | null = null;

  if (data.categoryId) {
    categoryId = toObjectId(data.categoryId);
    if (!categoryId) return { ok: false, error: "Invalid category" };
  }
  if (data.brand) {
    brand = toObjectId(data.brand);
    if (!brand) return { ok: false, error: "Invalid brand" };
  }

  if (categoryId) {
    try {
      await validateRequiredCategoryAttributes(categoryId.toString(), data);
    } catch (e: any) {
      return { ok: false, error: e.message || "Missing required fields" };
    }
  }

  // ---- Flat payload: everything the client sent, normalized ----
  const payload: any = {
    ...baseData,
    status: normalizeStatus(data.status),
    updatedAt: new Date(),
  };

  if (categoryId) payload.categoryId = categoryId;
  if (brand) payload.brand = brand;
  if (data.name) payload.slug = generateSlug(data.name, data.department);

  // productCode → { type, value }
  if (data.type && data.value) {
    payload.productCode = { type: data.type, value: data.value };
    delete payload.type;
    delete payload.value;
  } else if (data.productCode) {
    payload.productCode = sanitizeProductCode(data.productCode);
  }

  // relatedProducts
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

  // variantValues → plain map
  if (payload.variantValues !== undefined) {
    const normalized = normalizeVariantValuesMap(payload.variantValues);
    if (normalized) {
      payload.variantValues = normalized;
    } else {
      delete payload.variantValues;
    }
  }

  // variantThemes → camelCased
  if (Array.isArray(payload.variantThemes)) {
    payload.variantThemes = payload.variantThemes.map((c: any) =>
      String(c).replace(/_([a-z])/g, (_: string, ch: string) =>
        ch.toUpperCase(),
      ),
    );
  }

  // variants → unwrap { value } wrappers, sanitize media, keep theme keys
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

  // 🚫 Model B: no structured arrays. Explicitly strip any that leak in
  //    from legacy drafts or clients.
  delete payload.keyFeatures;
  delete payload.specifications;

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

export async function findProducts(
  params: ProductListParams = {},
): Promise<ProductListResult> {
  await connection();

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));
  const skip = (page - 1) * pageSize;
  const sortField = params.sort ?? "createdAt";
  const sortDir = params.sortDir === "asc" ? 1 : -1;

  const match: Record<string, any> = {};

  if (params.status) match.status = params.status;
  if (params.categoryId && mongoose.Types.ObjectId.isValid(params.categoryId)) {
    match.categoryId = new mongoose.Types.ObjectId(params.categoryId);
  }

  const q = (params.q ?? "").trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    match.$or = [
      { name: rx },
      { sku: rx },
      { tags: rx },
      { shortDescription: rx },
    ];
  }

  try {
    const pipeline: any[] = [];
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    pipeline.push({
      $facet: {
        rows: [
          { $sort: { [sortField]: sortDir } },
          { $skip: skip },
          { $limit: pageSize },
          {
            $lookup: {
              from: "categories",
              localField: "categoryId",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $lookup: {
              from: "brands",
              localField: "brand",
              foreignField: "_id",
              as: "brandDoc",
            },
          },
          {
            $addFields: {
              categoryId: { $arrayElemAt: ["$category", 0] },
              brand: { $arrayElemAt: ["$brandDoc", 0] },
            },
          },
          { $project: { category: 0, brandDoc: 0 } },
        ],
        total: [{ $count: "count" }],
      },
    });

    const [facet] = await Product.aggregate(pipeline);
    const rows: any[] = facet?.rows ?? [];
    const total: number = facet?.total?.[0]?.count ?? 0;

    return {
      products: rows.map(serialize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error("Error finding products:", error);
    return { ...LIST_UNAUTHORIZED, page, pageSize };
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

export async function createProduct(formData: any): Promise<ProductResponse> {
  try {
    await connection();

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
    const payload = { ...prepared.payload, createdAt: now, updatedAt: now };
    const product = new Product(payload);
    await product.save();

    revalidatePath("/catalog/products");
    return { success: true, data: serialize(product) };
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

    const payload = { ...prepared.payload };
    delete payload.createdAt;
    delete payload._id;
    delete payload.__v;
    payload.updatedAt = new Date();

    // 🚫 Model B migration: strip any legacy structured arrays still
    //    present on the document, so old products get cleaned up on
    //    their next save.
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

export async function deleteProduct(
  id: string,
  options: DeleteProductOptions = {},
): Promise<ProductResponse> {
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

    if (options.recreate) {
      const clone: any = product.toObject();
      delete clone._id;
      delete clone.__v;
      delete clone.createdAt;
      delete clone.updatedAt;
      delete clone.keyFeatures;
      delete clone.specifications;
      clone.status = "draft";
      clone.createdAt = new Date();
      clone.updatedAt = new Date();
      const recreated = new Product(clone);
      await recreated.save();
      await Product.findByIdAndDelete(id);
      revalidatePath("/catalog/products");
      return {
        success: true,
        data: {
          deletedId: id,
          recreatedId: recreated._id.toString(),
          product: serialize(recreated),
        },
      };
    }

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
