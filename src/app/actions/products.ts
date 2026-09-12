// app/actions/products.ts
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

const UNAUTHORIZED = { success: false as const, error: "Unauthorized" };
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

function normalizeKeyValueCollection(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const k = entry.k ?? entry.key ?? entry.name ?? "";
        const key = String(k).trim();
        if (!key) return null;
        const result: any = { k: key, v: entry.v ?? entry.value ?? "" };
        if (entry.unit) result.unit = entry.unit;
        return result;
      })
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => {
        const key = String(k).trim();
        return key ? { k: key, v: v ?? "" } : null;
      })
      .filter(Boolean);
  }
  return [];
}

function sanitizeSpecifications(specs: any[]): any[] {
  if (!Array.isArray(specs)) return [];
  return specs.map((g) => ({
    ...g,
    attributes: normalizeKeyValueCollection(g.attributes || []),
    groups: g.groups ? sanitizeSpecifications(g.groups) : [],
  }));
}

function serialize(doc: any): any {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return JSON.parse(JSON.stringify(obj));
}

async function buildStructuredFields(
  flatData: Record<string, any>,
  categoryId: string,
): Promise<{
  keyFeatures: any[];
  specifications: any[];
  leftover: Record<string, any>;
}> {
  const attributeSets = await getCategoryAttributeSets(categoryId);
  const result: { keyFeatures: any[]; specifications: any[] } = {
    keyFeatures: [],
    specifications: [],
  };
  const usedKeys = new Set<string>();

  function collectAttributeCodes(group: any, codes: Set<string>) {
    group.attributes?.forEach((a: any) => codes.add(a.code));
    group.children?.forEach((c: any) => collectAttributeCodes(c, codes));
  }

  for (const set of attributeSets) {
    for (const group of set.groups || []) {
      const groupCode = group.code.replace(/_([a-z])/g, (_, c) =>
        c.toUpperCase(),
      );
      const allAttrCodes = new Set<string>();
      collectAttributeCodes(group, allAttrCodes);

      if (groupCode === "keyFeatures") {
        const features: any[] = [];
        for (const code of allAttrCodes) {
          const camel = code.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          const value = flatData[camel];
          if (value !== undefined && value !== null && value !== "") {
            let unit: string | undefined;
            let finalValue = value;
            if (
              value &&
              typeof value === "object" &&
              "value" in value &&
              "unit" in value
            ) {
              finalValue = value.value;
              unit = value.unit;
            }
            features.push({
              k: camel,
              v: finalValue,
              ...(unit ? { unit } : {}),
            });
            usedKeys.add(camel);
          }
        }
        if (features.length) {
          result.keyFeatures = normalizeKeyValueCollection(features);
        }
      } else if (groupCode === "specifications") {
        function buildSpecGroup(g: any): any {
          const groupName = g.name || g.code;
          const groupAttrs: any[] = [];
          const childGroups: any[] = [];
          g.attributes?.forEach((attr: any) => {
            const camel = attr.code.replace(/_([a-z])/g, (_: any, c: string) =>
              c.toUpperCase(),
            );
            const value = flatData[camel];
            if (value !== undefined && value !== null && value !== "") {
              let unit: string | undefined;
              let finalValue = value;
              if (
                value &&
                typeof value === "object" &&
                "value" in value &&
                "unit" in value
              ) {
                finalValue = value.value;
                unit = value.unit;
              }
              groupAttrs.push({
                k: camel,
                v: finalValue,
                ...(unit ? { unit } : {}),
              });
              usedKeys.add(camel);
            }
          });
          g.children?.forEach((child: any) => {
            const cr = buildSpecGroup(child);
            if (cr.attributes.length || cr.groups.length) childGroups.push(cr);
          });
          return {
            name: groupName,
            attributes: normalizeKeyValueCollection(groupAttrs),
            groups: childGroups,
          };
        }
        const built = buildSpecGroup(group);
        if (built.attributes.length || built.groups.length) {
          result.specifications.push(built);
        }
      }
    }
  }

  const leftover: Record<string, any> = {};
  for (const [k, v] of Object.entries(flatData)) {
    if (!usedKeys.has(k)) leftover[k] = v;
  }
  return { ...result, leftover };
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
// SERVER ACTIONS
// ==================================================================

/** Single product by id (auth required). */
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

/**
 * Server-side filtered, sorted, paginated product list.
 * Also supports the legacy "return everything for related-products picker"
 * via `pageSize: 100` (defaults cap at 100).
 */
export async function findProducts(
  params: ProductListParams = {},
): Promise<ProductListResult> {
  await connection();

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));
  const skip = (page - 1) * pageSize;
  const sortField = params.sort ?? "createdAt";
  const sortDir = params.sortDir === "asc" ? 1 : -1;

  // Build the pipeline match stage from filters.
  const match: Record<string, any> = {};

  if (params.status) {
    match.status = params.status;
  }

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

/** Distinct categories for the filter bar (name + id). */
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

/** Create or update. */
export async function createOrUpdateProduct(
  formData: any,
): Promise<ProductResponse> {
  try {
    await connection();

    const validated = safeValidateProductCreateOrUpdate(formData);
    if (!validated.success) {
      return { success: false, error: `Validation failed: ${validated.error}` };
    }

    const data = validated.data || formData;
    const existingId = data._id ? toObjectId(data._id) : null;

    const baseData: any = { ...data };
    delete baseData._id;

    let categoryId: mongoose.Types.ObjectId | null = null;
    let brand: mongoose.Types.ObjectId | null = null;

    if (data.categoryId) {
      categoryId = toObjectId(data.categoryId);
      if (!categoryId) return { success: false, error: "Invalid category" };
    }
    if (data.brand) {
      brand = toObjectId(data.brand);
      if (!brand) return { success: false, error: "Invalid brand" };
    }

    if (categoryId) {
      await validateRequiredCategoryAttributes(categoryId.toString(), data);
    }

    const productData: any = {
      ...baseData,
      status: normalizeStatus(data.status),
      updatedAt: new Date(),
    };

    if (categoryId) productData.categoryId = categoryId;
    if (brand) productData.brand = brand;
    if (data.name) productData.slug = generateSlug(data.name, data.department);

    if (data.type && data.value) {
      productData.productCode = { type: data.type, value: data.value };
      delete productData.type;
      delete productData.value;
    } else if (data.productCode) {
      productData.productCode = sanitizeProductCode(data.productCode);
    }

    if (categoryId) {
      const { keyFeatures, specifications } = await buildStructuredFields(
        productData,
        categoryId.toString(),
      );
      productData.keyFeatures = keyFeatures;
      productData.specifications = specifications;
      const usedKeys = new Set<string>();
      keyFeatures.forEach((i: any) => usedKeys.add(i.k));
      specifications.forEach((g: any) => {
        const collect = (gg: any) => {
          gg.attributes?.forEach((a: any) => usedKeys.add(a.k));
          gg.groups?.forEach(collect);
        };
        collect(g);
      });
      for (const key of usedKeys) delete productData[key];
    }

    if (productData.keyFeatures) {
      productData.keyFeatures = normalizeKeyValueCollection(
        productData.keyFeatures,
      );
    }
    if (productData.specifications) {
      productData.specifications = sanitizeSpecifications(
        productData.specifications,
      );
    }

    if (data.relatedProducts !== undefined) {
      if (Array.isArray(data.relatedProducts)) {
        productData.relatedProducts = data.relatedProducts
          .filter((rp: any) => rp && rp.id)
          .map((rp: any) => ({
            product: toObjectId(rp.id),
            relationshipType: rp.relationshipType || "",
          }))
          .filter((rp: any) => rp.product);
      }
    }

    let product;
    let isNew = false;

    if (existingId) {
      const existing = await Product.findById(existingId);
      if (existing) {
        delete productData.createdAt;
        product = await Product.findByIdAndUpdate(
          existingId,
          { $set: productData },
          { new: true, runValidators: true },
        );
        if (!product) return { success: false, error: "Product not found" };
      } else {
        isNew = true;
      }
    } else {
      isNew = true;
    }

    if (isNew) {
      productData.createdAt = new Date();
      product = new Product(productData);
      await product.save();
    }

    revalidatePath("/catalog/products");
    if (existingId) {
      revalidatePath(`/catalog/products/edit/${existingId.toString()}`);
    }
    return { success: true, data: serialize(product) };
  } catch (error: any) {
    console.error("Error in createOrUpdateProduct:", error);
    return { success: false, error: error.message || "Failed to save product" };
  }
}

/** Delete (or duplicate-and-delete). */
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

/** Delete a product image from storage + product record. */
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
