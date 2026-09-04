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
interface ProductResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface DeleteProductOptions {
  recreate?: boolean;
}

// ---------- Helpers ----------

function toObjectId(value: any): mongoose.Types.ObjectId | null {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
}

function generateSlug(name: string, department?: string | null): string {
  return slugify(`${name}${department ? `-${department}` : ""}`, {
    lower: true,
  });
}

function normalizeStatus(status: unknown): "draft" | "active" | "inactive" {
  const str = String(status ?? "draft").toLowerCase();
  if (str === "active" || str === "inactive" || str === "draft")
    return str as any;
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

/** Normalize a key-value collection: ensure it's an array of {k, v, unit?} without _id */
function normalizeKeyValueCollection(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const k = entry.k ?? entry.key ?? entry.name ?? "";
        const normalizedKey = String(k).trim();
        if (!normalizedKey) return null;
        const result: any = {
          k: normalizedKey,
          v: entry.v ?? entry.value ?? entry.values ?? "",
        };
        if (entry.unit) result.unit = entry.unit;
        return result;
      })
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => {
        const key = String(k).trim();
        if (!key) return null;
        return { k: key, v: v ?? "" };
      })
      .filter(Boolean);
  }
  return [];
}

function sanitizeSpecifications(specs: any[]): any[] {
  if (!Array.isArray(specs)) return [];
  return specs.map((group) => ({
    ...group,
    attributes: normalizeKeyValueCollection(group.attributes || []),
    groups: group.groups ? sanitizeSpecifications(group.groups) : [],
  }));
}

// ---------- Build structured fields from flat attributes ----------
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

  // Helper to collect all attribute codes from a group (including children)
  function collectAttributeCodes(group: any, codes: Set<string>) {
    group.attributes?.forEach((attr: any) => codes.add(attr.code));
    group.children?.forEach((child: any) =>
      collectAttributeCodes(child, codes),
    );
  }

  // Process each group in each set
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
          const camelCode = code.replace(/_([a-z])/g, (_, c) =>
            c.toUpperCase(),
          );
          const value = flatData[camelCode];
          if (value !== undefined && value !== null && value !== "") {
            let unit: string | undefined = undefined;
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
              k: camelCode,
              v: finalValue,
              ...(unit ? { unit } : {}),
            });
            usedKeys.add(camelCode);
          }
        }
        if (features.length) {
          result.keyFeatures = normalizeKeyValueCollection(features);
        }
      } else if (groupCode === "specifications") {
        // Build a hierarchical structure from group and its children
        function buildSpecGroup(g: any): any {
          const groupName = g.name || g.code;
          const groupAttrs: any[] = [];
          const childGroups: any[] = [];

          g.attributes?.forEach((attr: any) => {
            const camelCode = attr.code.replace(
              /_([a-z])/g,
              (_: any, c: string) => c.toUpperCase(),
            );
            const value = flatData[camelCode];
            if (value !== undefined && value !== null && value !== "") {
              let unit: string | undefined = undefined;
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
                k: camelCode,
                v: finalValue,
                ...(unit ? { unit } : {}),
              });
              usedKeys.add(camelCode);
            }
          });

          g.children?.forEach((child: any) => {
            const childResult = buildSpecGroup(child);
            if (childResult.attributes.length || childResult.groups.length) {
              childGroups.push(childResult);
            }
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
      // Other groups are left as flat fields (they are not part of keyFeatures/specifications)
    }
  }

  // Leftover: all flat data except keys that were consumed
  const leftover: Record<string, any> = {};
  for (const [key, value] of Object.entries(flatData)) {
    if (!usedKeys.has(key)) {
      leftover[key] = value;
    }
  }

  return { ...result, leftover };
}

/** Validate that all required category attributes are present */
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
    const camelCode = code.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const value = data[camelCode];
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

/** Serialize Mongoose document to plain object (convert ObjectId to string, Date to ISO) */
function serialize(doc: any): any {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return JSON.parse(JSON.stringify(obj));
}

// ---------- Server Actions ----------

/** Find products – by ID or all (with aggregation-based population) */
export async function findProducts(id?: string) {
  try {
    await connection();
    if (id) {
      const product = await Product.findById(id).lean();
      if (!product) return { success: false, error: "Product not found" };
      return serialize(product);
    }

    // Use aggregation to safely join category and brand without casting errors
    const products = await Product.aggregate([
      {
        $lookup: {
          from: "categories", // MongoDB collection name (default: pluralized, lowercase)
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "brands", // MongoDB collection name
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $addFields: {
          categoryId: { $arrayElemAt: ["$category", 0] },
          brand: { $arrayElemAt: ["$brand", 0] },
        },
      },
      { $project: { category: 0, brand: 0 } },
      { $sort: { createdAt: -1 } },
    ]);

    return products.map(serialize);
  } catch (error) {
    console.error("Error finding products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

/** Create or update a product (upsert by ID if provided) */
export async function createOrUpdateProduct(
  formData: any,
): Promise<ProductResponse> {
  try {
    await connection();

    // Validate with Zod (allows _id for upsert)
    const validated = safeValidateProductCreateOrUpdate(formData);
    if (!validated.success) {
      return { success: false, error: `Validation failed: ${validated.error}` };
    }

    const data = validated.data || formData;
    const existingId = data._id ? toObjectId(data._id) : null;

    // Prepare base product data (common to both create and update)
    const baseData: any = { ...data };
    delete baseData._id;

    // Handle category and brand IDs
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

    // Validate required category attributes (if category is provided)
    if (categoryId) {
      await validateRequiredCategoryAttributes(categoryId.toString(), data);
    }

    // Build the document data (start with everything)
    const productData: any = {
      ...baseData,
      status: normalizeStatus(data.status),
      updatedAt: new Date(),
    };

    if (categoryId) productData.categoryId = categoryId;
    if (brand) productData.brand = brand;
    if (data.name) {
      productData.slug = generateSlug(data.name, data.department);
    }

    // Handle productCode
    if (data.type && data.value) {
      productData.productCode = { type: data.type, value: data.value };
      delete productData.type;
      delete productData.value;
    } else if (data.productCode) {
      productData.productCode = sanitizeProductCode(data.productCode);
    }

    // -------- Build structured fields from flat attributes ----------
    if (categoryId) {
      const { keyFeatures, specifications, leftover } =
        await buildStructuredFields(productData, categoryId.toString());
      // Replace structured fields
      productData.keyFeatures = keyFeatures;
      productData.specifications = specifications;
      // Keep leftover flat fields (they are not part of keyFeatures/specifications)
      // but we already have them in productData; we need to remove the keys that were used
      // Actually we can just keep productData as is; the structured fields are added,
      // and the flat keys remain – they won't conflict with the model because the model is strict: false.
      // However, we may want to delete them to keep the document clean.
      // We'll remove the keys that were consumed by keyFeatures/specifications.
      const usedKeys = new Set<string>();
      // Collect used keys from keyFeatures and specifications
      keyFeatures.forEach((item: any) => usedKeys.add(item.k));
      specifications.forEach((group: any) => {
        const collect = (g: any) => {
          g.attributes?.forEach((attr: any) => usedKeys.add(attr.k));
          g.groups?.forEach(collect);
        };
        collect(group);
      });
      for (const key of usedKeys) {
        delete productData[key];
      }
      // Also delete any keys that might have been used but are not in the usedKeys set? No, we only delete those used.
    }

    // Normalize keyFeatures and specifications (ensure arrays, strip _id)
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

    // Handle relatedProducts
    if (data.relatedProducts !== undefined) {
      if (
        Array.isArray(data.relatedProducts) &&
        data.relatedProducts.length === 0
      ) {
        productData.relatedProducts = [];
      } else if (Array.isArray(data.relatedProducts)) {
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
        if (!product) {
          return { success: false, error: "Product not found" };
        }
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

    revalidatePath("/products");
    return { success: true, data: serialize(product) };
  } catch (error: any) {
    console.error("Error in createOrUpdateProduct:", error);
    return { success: false, error: error.message || "Failed to save product" };
  }
}

/** Delete a product, optionally recreate it as draft */
export async function deleteProduct(
  id: string,
  options: DeleteProductOptions = {},
): Promise<ProductResponse> {
  try {
    await connection();
    if (!id) return { success: false, error: "Product ID required" };

    const product = await Product.findById(id);
    if (!product) return { success: false, error: "Product not found" };

    // Remove references from other products
    await Product.updateMany(
      { "relatedProducts.product": new mongoose.Types.ObjectId(id) },
      {
        $pull: {
          relatedProducts: { product: new mongoose.Types.ObjectId(id) },
        },
      },
    );

    if (options.recreate) {
      // Clone product, set to draft, and save new one
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
      // Delete the original
      await Product.findByIdAndDelete(id);
      revalidatePath("/products");
      return {
        success: true,
        data: {
          deletedId: id,
          recreatedId: recreated._id.toString(),
          product: serialize(recreated),
        },
      };
    }

    // Normal delete
    await Product.findByIdAndDelete(id);
    revalidatePath("/products");
    return { success: true, data: "Product deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return {
      success: false,
      error: error.message || "Failed to delete product",
    };
  }
}

/** Delete product images from storage and product record */
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
        const encodedFileName = urlObj.pathname.split("/").pop();
        if (encodedFileName) {
          const fileName = decodeURIComponent(encodedFileName);
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
        // Remove specific image from product
        const images = product.images || [];
        if (!images.includes(imageUrl)) {
          return { success: false, error: "Image URL not found in product" };
        }
        await deleteFromStorage(imageUrl);
        product.images = images.filter((url: string) => url !== imageUrl);
        await product.save();
        return { success: true, data: serialize(product) };
      } else {
        // Delete all images? Not implemented – we require imageUrl.
        return { success: false, error: "Image URL required" };
      }
    } else if (imageUrl) {
      // No productId provided – just delete from storage
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
