// app/actions/products.ts
"use server";

import { connection } from "@/utils/connection";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { ref, deleteObject } from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";
import mongoose from "mongoose";
import Product from "@/models/Product";
import Brand from "@/models/Brand";
import Category from "@/models/Category";
import "@/models/Attribute";
import "@/models/User";
import { getCategoryAttributeSets } from "@/app/actions/category";
import {
  validateProductCreate,
  validateProductUpdate,
  validateProductCreateOrUpdate,
  safeValidateProductCreate,
  safeValidateProductUpdate,
  safeValidateProductCreateOrUpdate,
  CreateProductSchema,
  UpdateProductSchema,
  CreateOrUpdateProductSchema,
} from "@/lib/product.schema";

// ---------- Helper: serialize ----------
function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (
    obj instanceof mongoose.Types.ObjectId ||
    obj._bsontype === "ObjectId" ||
    typeof obj.toHexString === "function"
  ) {
    return obj.toString();
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serialize);
  }
  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serialize(obj[key]);
    }
    return result;
  }
  return obj;
}

// ---------- Helper: add legacy aliases ----------
function addLegacyProductAliases(product: any): any {
  if (!product || typeof product !== "object") return product;
  const result = { ...product };
  result.title ??= result.name ?? "";
  result.name ??= result.title ?? "";
  result.model ??= result.productCode?.value ?? "";
  result.category_id ??= result.categoryId ?? null;
  result.categoryId ??= result.category_id ?? null;
  result.main_image ??= result.mainImage ?? "";
  result.mainImage ??= result.main_image ?? "";
  result.list_price ??= result.listPrice ?? 0;
  result.listPrice ??= result.list_price ?? 0;
  result.sale_price ??= result.salePrice ?? result.listPrice ?? 0;
  result.salePrice ??= result.sale_price ?? result.listPrice ?? 0;
  result.related_products ??= result.relatedProducts ?? [];
  result.relatedProducts ??= result.related_products ?? [];
  result.short_description ??= result.shortDescription ?? "";
  result.shortDescription ??= result.short_description ?? "";
  result.short_desc ??= result.shortDescription ?? "";
  result.low_stock_threshold ??= result.lowStockThreshold ?? 0;
  result.lowStockThreshold ??= result.low_stock_threshold ?? 0;
  result.stock_status ??= result.status ? [result.status] : [];
  result.status ??=
    Array.isArray(result.stock_status) && result.stock_status.length
      ? result.stock_status[0]
      : "draft";
  result.stockQuantity ??= result.quantity ?? 0;
  result.quantity ??= result.stockQuantity ?? 0;
  result.image ??= result.mainImage ?? result.main_image ?? "";
  return result;
}

// ---------- Types ----------
export interface CreateProductForm {
  category_id: string;
  brand: string;
  name?: string;
  department?: string;
  related_products?: { id: string; relationship_type: string }[];
  [key: string]: any;
}

interface ProductResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface DeleteProductOptions {
  recreate?: boolean;
}

// ---------- Helper: sanitize productCode ----------
function sanitizeProductCode(productCode: any): any {
  if (!productCode) return null;
  let code = productCode;
  if (Array.isArray(code) && code.length > 0) {
    code = code[0];
  }
  if (!code || typeof code !== "object") return null;
  const type = code.type || "";
  const value = code.value || "";
  if (!type || !value) return null;
  return { type, value };
}

// ---------- Helper: normalize key-value collections (strips _id) ----------
function normalizeKeyValueCollection(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const key = entry.k ?? entry.key ?? entry.name ?? "";
        const normalizedKey =
          typeof key === "string" ? key.trim() : String(key ?? "").trim();
        if (!normalizedKey) return null;
        const normalizedEntry: Record<string, any> = {
          k: normalizedKey,
          v: entry.v ?? entry.value ?? entry.values ?? "",
        };
        if (entry.unit) normalizedEntry.unit = entry.unit;
        // Remove _id if present (Mongoose will auto-generate if needed)
        delete normalizedEntry._id;
        return normalizedEntry;
      })
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, val]) => {
        const normalizedKey = String(key).trim();
        if (!normalizedKey) return null;
        return { k: normalizedKey, v: val ?? "" };
      })
      .filter(Boolean);
  }
  return [];
}

// ---------- Helper Functions ----------
function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  if (!obj || typeof obj !== "object") return {};
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value != null && !(typeof value === "string" && !value.trim())) {
      if (key === "attributes" && typeof value === "object") {
        return { ...acc, ...value };
      }
      return { ...acc, [key]: value };
    }
    return acc;
  }, {});
}

function normalizeProductStatus(
  status?: unknown,
): "draft" | "active" | "inactive" {
  const value = typeof status === "string" ? status : String(status ?? "draft");
  const current = value.toLowerCase();
  if (current === "active" || current === "inactive" || current === "draft") {
    return current;
  }
  return "draft";
}

async function validateRequiredCategoryAttributes(
  categoryId: string,
  productData: Record<string, any>,
) {
  if (!categoryId) return;
  try {
    const attributeSets = await getCategoryAttributeSets(categoryId);
    const requiredCodes = new Set<string>();
    for (const set of attributeSets) {
      for (const group of set.groups ?? []) {
        for (const attribute of group.attributes ?? []) {
          if (attribute.isRequired && attribute.code) {
            requiredCodes.add(attribute.code);
          }
        }
      }
    }
    if (requiredCodes.size === 0) return;
    const ignoredRequiredCodes = new Set(["sale_price", "salePrice"]);
    const missing: string[] = [];
    for (const code of requiredCodes) {
      if (ignoredRequiredCodes.has(code)) continue;
      const value = productData[code];
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && !value.trim()) ||
        (Array.isArray(value) && value.length === 0)
      ) {
        missing.push(code);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Required product fields missing for this category: ${missing.join(", ")}`,
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Required product fields")
    ) {
      throw error;
    }
  }
}

function generateSlug(name: string, department: string | null): string {
  return slugify(`${name}${department ? `-${department}` : ""}`, {
    lower: true,
  });
}

function extractIdCandidate(value: any): any {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value)) return extractIdCandidate(value[0]);
  if (typeof value === "object") {
    if (value instanceof mongoose.Types.ObjectId) return value.toString();
    if (
      typeof value.toHexString === "function" &&
      value.constructor?.name === "ObjectId"
    ) {
      return value.toString();
    }
    for (const key of [
      "_id",
      "id",
      "value",
      "categoryId",
      "category_id",
      "brand",
      "brandId",
    ]) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const nested = extractIdCandidate(value[key]);
        if (nested !== null && nested !== undefined) return nested;
      }
    }
    for (const key of Object.keys(value)) {
      if (["name", "label", "slug", "url_slug"].includes(key)) continue;
      const nested = extractIdCandidate(value[key]);
      if (nested !== null && nested !== undefined) return nested;
    }
  }
  return null;
}

function toObjectId(value: any): mongoose.Types.ObjectId | null {
  const candidate = extractIdCandidate(value);
  if (candidate === null || candidate === undefined || candidate === "")
    return null;
  const stringValue =
    typeof candidate === "string" ? candidate.trim() : String(candidate);
  if (mongoose.Types.ObjectId.isValid(stringValue)) {
    return new mongoose.Types.ObjectId(stringValue);
  }
  return null;
}

// ---------- Manual population ----------
async function populateProduct(product: any) {
  if (!product) return product;
  const result = { ...product };

  if (result.categoryId) {
    try {
      const category = await Category.findById(result.categoryId)
        .select("_id name")
        .lean()
        .exec();
      if (category) {
        result.categoryId = category;
      } else {
        result.categoryId = null;
      }
    } catch (e: any) {
      console.warn(`Invalid categoryId ${result.categoryId}:`, e.message);
      result.categoryId = null;
    }
  }

  if (result.brand) {
    try {
      const brand = await Brand.findById(result.brand)
        .select("_id name")
        .lean()
        .exec();
      if (brand) {
        result.brand = brand;
      } else {
        result.brand = null;
      }
    } catch (e: any) {
      console.warn(`Invalid brand ${result.brand}:`, e.message);
      result.brand = null;
    }
  }

  return result;
}

// ---------- Server Actions ----------
export async function findProducts(id?: string) {
  try {
    await connection();
    if (id) {
      const product = await Product.findById(id).lean().exec();
      if (!product) return { success: false, error: "Product not found" };
      const populated = await populateProduct(product);
      const serialized = serialize(populated);
      return addLegacyProductAliases(serialized);
    }
    const products = await Product.find().sort({ createdAt: -1 }).lean().exec();
    if (!products || products.length === 0) {
      console.log("No products found");
      return [];
    }
    const populated = await Promise.all(products.map(populateProduct));
    const serialized = serialize(populated);
    return (serialized as any[]).map(addLegacyProductAliases);
  } catch (error) {
    console.error("Error finding products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

// ---------- Build keyFeatures and specifications ----------
async function buildStructuredFields(
  flatData: Record<string, any>,
  categoryId: string,
): Promise<Record<string, any>> {
  const result = { ...flatData };
  const attributeSets = await getCategoryAttributeSets(categoryId);
  if (!attributeSets || attributeSets.length === 0) {
    return result;
  }

  // If keyFeatures is already present as an array, preserve it and don't rebuild
  if (Array.isArray(result.keyFeatures) && result.keyFeatures.length > 0) {
    // Delete flat keys that would otherwise be moved into keyFeatures
    const keyFeatureCodes: string[] = [];
    for (const set of attributeSets) {
      for (const group of set.groups || []) {
        const normalizedGroupCode = group.code.replace(/_([a-z])/g, (_, c) =>
          c.toUpperCase(),
        );
        if (normalizedGroupCode === "keyFeatures") {
          for (const attr of group.attributes || []) {
            const camelCode = attr.code.replace(/_([a-z])/g, (_, c) =>
              c.toUpperCase(),
            );
            keyFeatureCodes.push(camelCode);
          }
        }
      }
    }
    for (const code of keyFeatureCodes) {
      if (result[code] !== undefined) {
        delete result[code];
      }
    }
    // Normalize keyFeatures (strip _id)
    result.keyFeatures = normalizeKeyValueCollection(result.keyFeatures);
    return result;
  }

  // Otherwise, build keyFeatures from flat attributes
  const keyFeatureCodes: string[] = [];
  const specGroupMap: Record<
    string,
    {
      groupId: string;
      groupCode: string;
      groupName: string;
      attributeCodes: string[];
    }
  > = {};

  for (const set of attributeSets) {
    for (const group of set.groups || []) {
      const normalizedGroupCode = group.code.replace(/_([a-z])/g, (_, c) =>
        c.toUpperCase(),
      );
      if (normalizedGroupCode === "keyFeatures") {
        for (const attr of group.attributes || []) {
          keyFeatureCodes.push(attr.code);
        }
      } else if (normalizedGroupCode === "specifications") {
        const traverse = (g: any) => {
          const code = g.code.replace(/_([a-z])/g, (_: any, c: string) =>
            c.toUpperCase(),
          );
          const name = g.name || code;
          const attrCodes = (g.attributes || []).map((a: any) => a.code);
          const groupKey = g.id || code;
          if (!specGroupMap[groupKey]) {
            specGroupMap[groupKey] = {
              groupId: g.id,
              groupCode: code,
              groupName: name,
              attributeCodes: [],
            };
          }
          specGroupMap[groupKey].attributeCodes.push(...attrCodes);
          for (const child of g.children || []) {
            traverse(child);
          }
        };
        traverse(group);
      }
    }
  }

  if (keyFeatureCodes.length > 0) {
    const keyFeatures: any[] = [];
    for (const code of keyFeatureCodes) {
      const camelCode = code.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (result[camelCode] !== undefined) {
        const value = result[camelCode];
        if (value && typeof value === "object" && "value" in value) {
          keyFeatures.push({ k: camelCode, v: value.value, unit: value.unit });
        } else {
          keyFeatures.push({ k: camelCode, v: value });
        }
        delete result[camelCode];
      }
    }
    if (keyFeatures.length > 0) {
      result.keyFeatures = normalizeKeyValueCollection(keyFeatures);
    }
  }

  const specGroups: any[] = [];
  for (const groupKey of Object.keys(specGroupMap)) {
    const groupInfo = specGroupMap[groupKey];
    const attributes: any[] = [];
    for (const code of groupInfo.attributeCodes) {
      const camelCode = code.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (result[camelCode] !== undefined) {
        const value = result[camelCode];
        if (value && typeof value === "object" && "value" in value) {
          attributes.push({ k: camelCode, v: value.value, unit: value.unit });
        } else {
          attributes.push({ k: camelCode, v: value });
        }
        delete result[camelCode];
      }
    }
    if (attributes.length > 0) {
      specGroups.push({
        name: groupInfo.groupName || groupInfo.groupCode,
        attributes: normalizeKeyValueCollection(attributes),
      });
    }
  }
  if (specGroups.length > 0) {
    result.specifications = specGroups;
  }

  if (
    result.variantValues !== undefined &&
    !Array.isArray(result.variantValues)
  ) {
    result.variantValues = normalizeKeyValueCollection(result.variantValues);
  }
  if (result.keyFeatures !== undefined && !Array.isArray(result.keyFeatures)) {
    result.keyFeatures = normalizeKeyValueCollection(result.keyFeatures);
  }

  return result;
}

// ---------- finalizeCanonicalProductData ----------
async function finalizeCanonicalProductData(
  data: Record<string, any>,
  categoryId?: string,
) {
  const canonicalData = { ...data };
  for (const key of ["categoryId", "brand"]) {
    if (canonicalData[key] === null || canonicalData[key] === undefined) {
      delete canonicalData[key];
      continue;
    }
    const scalar = toScalarId(canonicalData[key]);
    if (scalar) {
      canonicalData[key] = scalar;
    } else {
      delete canonicalData[key];
    }
  }
  if (Array.isArray(canonicalData.carrier)) {
    const carrier = toScalarId(canonicalData.carrier);
    if (carrier) {
      canonicalData.carrier = carrier;
    } else {
      delete canonicalData.carrier;
    }
  }
  if (typeof canonicalData.status === "string") {
    canonicalData.status = canonicalData.status.trim().toLowerCase();
  }

  if (canonicalData.productCode) {
    canonicalData.productCode = sanitizeProductCode(canonicalData.productCode);
  }

  if (categoryId) {
    const structured = await buildStructuredFields(canonicalData, categoryId);
    return structured;
  }

  return canonicalData;
}

// ---------- createProduct ----------
export async function createProduct(
  formData: CreateProductForm,
): Promise<ProductResponse> {
  try {
    await connection();

    const normalizedIncoming = normalizeProductPayloadForValidation(formData);
    const canonicalData = await finalizeCanonicalProductData(
      normalizedIncoming,
      normalizedIncoming.categoryId || (formData as any).category_id,
    );

    const validationResult = safeValidateProductCreate(canonicalData);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Validation failed: ${validationResult.error}`,
      };
    }

    const {
      categoryId,
      brand,
      relatedProducts,
      quantity,
      lowStockThreshold,
      ...attributes
    } = validationResult.data || canonicalData;

    const cleanedAttributes = cleanObject(attributes);
    if (Object.keys(cleanedAttributes).length === 0) {
      return { success: false, error: "At least one attribute is required" };
    }

    try {
      await validateRequiredCategoryAttributes(
        categoryId || (formData as any).category_id,
        {
          ...cleanedAttributes,
          ...(brand ? { brand } : {}),
          ...(quantity !== undefined ? { quantity } : {}),
          ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
        },
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Category-required fields are missing.",
      };
    }

    const updateData: any = {
      categoryId: new mongoose.Types.ObjectId(
        categoryId || (formData as any).category_id,
      ),
      brand: new mongoose.Types.ObjectId(brand),
      ...cleanedAttributes,
      status: normalizeProductStatus(attributes.status as string),
      slug: attributes.name
        ? generateSlug(attributes.name, attributes.department ?? null)
        : undefined,
      updatedAt: new Date(),
    };

    // Handle productCode from attributes.type and attributes.value
    if (attributes.type && attributes.value) {
      updateData.productCode = {
        type: attributes.type,
        value: attributes.value,
      };
      delete updateData.type;
      delete updateData.value;
    } else if (attributes.productCode) {
      updateData.productCode = sanitizeProductCode(attributes.productCode);
    }

    if (relatedProducts) {
      updateData.relatedProducts = (relatedProducts as any[]).map(
        (rp: any) => ({
          product: new mongoose.Types.ObjectId(rp.id),
          relationshipType: rp.relationshipType || "",
        }),
      );
    }

    const newProduct = new Product({
      ...updateData,
      createdAt: new Date(),
    });
    await newProduct.save();

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error creating product:", error);
    if (error instanceof Error) {
      return {
        success: false,
        error: `Failed to create product: ${error.message}`,
      };
    }
    return { success: false, error: "Failed to create product" };
  }
}

// ---------- updateProduct ----------
export async function updateProduct(
  productId: string,
  formData: any,
): Promise<ProductResponse> {
  try {
    await connection();

    const normalizedIncoming = normalizeProductPayloadForValidation(formData);
    const rawKeys = Object.keys(normalizedIncoming ?? {});
    const categoryOnlyUpdate =
      rawKeys.length > 0 &&
      rawKeys.every(
        (key) => key === "categoryId" || key === "category_id" || key === "_id",
      );

    const canonicalData = await finalizeCanonicalProductData(
      normalizedIncoming,
      normalizedIncoming.categoryId || normalizedIncoming.category_id,
    );

    if (categoryOnlyUpdate) {
      const categoryId = canonicalData.categoryId ?? canonicalData.category_id;
      if (!productId)
        return { success: false, error: "Valid product ID is required" };
      if (!categoryId) return { success: false, error: "Category is required" };
      const updateData: any = {
        categoryId: new mongoose.Types.ObjectId(categoryId),
        updatedAt: new Date(),
      };
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(productId) },
        updateData,
        { new: true, runValidators: true },
      );
      if (!updatedProduct)
        return { success: false, error: "Product not found" };
      revalidatePath("/products");
      return { success: true, data: updatedProduct.toObject() };
    }

    const validationResult = safeValidateProductUpdate(canonicalData);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Validation failed: ${validationResult.error}`,
      };
    }

    const {
      categoryId,
      brand,
      relatedProducts,
      quantity,
      lowStockThreshold,
      ...attributes
    } = validationResult.data || canonicalData;

    if (!productId)
      return { success: false, error: "Valid product ID is required" };

    const cleanedAttributes = cleanObject(attributes);
    if (
      Object.keys(cleanedAttributes).length === 0 &&
      !categoryId &&
      !brand &&
      !relatedProducts &&
      quantity === undefined &&
      lowStockThreshold === undefined
    ) {
      return { success: false, error: "No valid attributes provided" };
    }

    if (categoryId) {
      try {
        await validateRequiredCategoryAttributes(categoryId, {
          ...cleanedAttributes,
          ...(brand ? { brand } : {}),
          ...(quantity !== undefined ? { quantity } : {}),
          ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
        });
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Category-required fields are missing.",
        };
      }
    }

    const updateData: any = { ...cleanedAttributes, updatedAt: new Date() };

    // Handle productCode from attributes.type and attributes.value
    if (attributes.type && attributes.value) {
      updateData.productCode = {
        type: attributes.type,
        value: attributes.value,
      };
      delete updateData.type;
      delete updateData.value;
    } else if (attributes.productCode) {
      updateData.productCode = sanitizeProductCode(attributes.productCode);
    }

    if (categoryId) {
      updateData.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
    if (brand) {
      updateData.brand = new mongoose.Types.ObjectId(brand);
    }
    if (relatedProducts !== undefined) {
      if (Array.isArray(relatedProducts) && relatedProducts.length === 0) {
        updateData.relatedProducts = [];
      } else if (Array.isArray(relatedProducts)) {
        updateData.relatedProducts = relatedProducts.map((rp: any) => ({
          product: new mongoose.Types.ObjectId(rp.id),
          relationshipType: rp.relationshipType || "",
        }));
      }
    }
    if (quantity !== undefined) {
      updateData.quantity = Number(quantity);
    }
    if (lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = Number(lowStockThreshold);
    }
    if (attributes.name) {
      updateData.slug = generateSlug(
        attributes.name,
        attributes.department ?? null,
      );
    }

    // Sanitize keyFeatures and specifications (remove _id)
    if (updateData.keyFeatures) {
      updateData.keyFeatures = normalizeKeyValueCollection(
        updateData.keyFeatures,
      );
    }
    if (updateData.specifications) {
      const sanitizeSpecs = (specs: any[]): any[] => {
        return specs.map((group: any) => ({
          ...group,
          attributes: normalizeKeyValueCollection(group.attributes || []),
          groups: group.groups ? sanitizeSpecs(group.groups) : [],
        }));
      };
      updateData.specifications = sanitizeSpecs(updateData.specifications);
    }

    console.log(
      "[updateProduct] Final updateData before save:",
      JSON.stringify(updateData, null, 2),
    );
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(productId) },
      { $set: updateData },
      { new: true, runValidators: true },
    );
    if (!updatedProduct) return { success: false, error: "Product not found" };

    revalidatePath("/products");
    return { success: true, data: updatedProduct.toObject() };
  } catch (error) {
    console.error("Error updating product:", error);
    if (error instanceof Error) {
      return {
        success: false,
        error: `Failed to update product: ${error.message}`,
      };
    }
    return { success: false, error: "Failed to update product" };
  }
}

function toScalarId(value: any): string | null {
  const candidate = extractIdCandidate(value);
  if (candidate === null || candidate === undefined || candidate === "")
    return null;
  const stringValue =
    typeof candidate === "string" ? candidate.trim() : String(candidate);
  return stringValue && stringValue !== "[object Object]" ? stringValue : null;
}

function normalizeProductPayloadForValidation(value: any): any {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeProductPayloadForValidation(item));
  }
  const normalized = { ...value };
  const refKeys = ["categoryId", "brand", "carrier"];
  for (const key of refKeys) {
    if (normalized[key] !== undefined) {
      const scalarValue = toScalarId(normalized[key]);
      if (scalarValue) {
        normalized[key] = scalarValue;
      } else {
        delete normalized[key];
      }
    }
  }
  if (typeof normalized.status === "string") {
    normalized.status = normalized.status.trim().toLowerCase();
  } else if (Array.isArray(normalized.status)) {
    normalized.status = normalized.status[0] || "draft";
    normalized.status = String(normalized.status).trim().toLowerCase();
  }
  if (Array.isArray(normalized.variants)) {
    normalized.variants = normalized.variants.map((variant: any) => {
      if (!variant || typeof variant !== "object") return variant;
      const nextVariant = { ...variant };
      if (Array.isArray(nextVariant.mainImage)) {
        nextVariant.mainImage = nextVariant.mainImage[0] || "";
      }
      if (Array.isArray(nextVariant.images)) {
        nextVariant.images = nextVariant.images.filter(Boolean);
      }
      return nextVariant;
    });
  }
  return normalized;
}

// ---------- createOrUpdateProduct ----------
export async function createOrUpdateProduct(
  productData: any,
): Promise<ProductResponse> {
  try {
    await connection();

    const normalizedIncoming =
      normalizeProductPayloadForValidation(productData);
    const categoryId =
      normalizedIncoming.categoryId || normalizedIncoming.category_id;
    const canonicalData = await finalizeCanonicalProductData(
      normalizedIncoming,
      categoryId,
    );

    console.log(
      "[createOrUpdateProduct] After finalizeCanonicalProductData:",
      JSON.stringify(canonicalData, null, 2),
    );

    const validationResult = safeValidateProductCreateOrUpdate(canonicalData);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Validation failed: ${validationResult.error}`,
      };
    }

    const {
      _id,
      categoryId: catId,
      brand,
      relatedProducts,
      quantity,
      lowStockThreshold,
      ...attributes
    } = validationResult.data || canonicalData;

    const cleanedAttributes = cleanObject(attributes);
    const { createdAt, updatedAt, __v, ...safeAttributes } = cleanedAttributes;

    console.log(
      "[createOrUpdateProduct] safeAttributes:",
      JSON.stringify(safeAttributes, null, 2),
    );

    if (catId) {
      try {
        await validateRequiredCategoryAttributes(catId, {
          ...safeAttributes,
          ...(brand ? { brand } : {}),
          ...(quantity !== undefined ? { quantity } : {}),
          ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
        });
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Category-required fields are missing.",
        };
      }
    }

    const updateData: any = {
      ...safeAttributes,
      updatedAt: new Date(),
    };

    // Only set status if it was provided (to avoid resetting to draft)
    if (safeAttributes.status !== undefined) {
      updateData.status = normalizeProductStatus(safeAttributes.status);
    }

    // Handle productCode from attributes.type and attributes.value
    if (safeAttributes.type && safeAttributes.value) {
      updateData.productCode = {
        type: safeAttributes.type,
        value: safeAttributes.value,
      };
      delete updateData.type;
      delete updateData.value;
    } else if (safeAttributes.productCode) {
      updateData.productCode = sanitizeProductCode(safeAttributes.productCode);
      delete updateData.type;
      delete updateData.value;
    }

    // Sanitize keyFeatures and specifications (remove _id)
    if (updateData.keyFeatures) {
      updateData.keyFeatures = normalizeKeyValueCollection(
        updateData.keyFeatures,
      );
    }
    if (updateData.specifications) {
      const sanitizeSpecs = (specs: any[]): any[] => {
        return specs.map((group: any) => ({
          ...group,
          attributes: normalizeKeyValueCollection(group.attributes || []),
          groups: group.groups ? sanitizeSpecs(group.groups) : [],
        }));
      };
      updateData.specifications = sanitizeSpecs(updateData.specifications);
    }

    const categoryObjectId = toObjectId(catId);
    if (!categoryObjectId) {
      return { success: false, error: "Invalid category selected." };
    }
    updateData.categoryId = categoryObjectId;

    const brandObjectId = toObjectId(brand);
    if (!brandObjectId) {
      return { success: false, error: "Invalid brand selected." };
    }
    updateData.brand = brandObjectId;

    if (relatedProducts !== undefined) {
      if (Array.isArray(relatedProducts)) {
        if (relatedProducts.length === 0) {
          updateData.relatedProducts = [];
        } else {
          const valid = relatedProducts
            .filter((rp: any) => rp && rp.id)
            .map((rp: any) => ({
              product: toObjectId(rp.id),
              relationshipType: rp.relationshipType || "",
            }))
            .filter((rp: any) => rp.product);
          updateData.relatedProducts = valid;
        }
      } else {
        const ids = (relatedProducts as any).ids || [];
        const valid = ids
          .filter((id: any) => id)
          .map((id: any) => ({
            product: toObjectId(id),
            relationshipType: (relatedProducts as any).relationshipType || "",
          }))
          .filter((rp: any) => rp.product);
        updateData.relatedProducts = valid;
      }
    }

    if (quantity !== undefined) {
      updateData.quantity = Number(quantity);
    }
    if (lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = Number(lowStockThreshold);
    }
    if (safeAttributes.name) {
      updateData.slug = generateSlug(
        safeAttributes.name,
        safeAttributes.department ?? null,
      );
    }

    console.log(
      "[createOrUpdateProduct] Final updateData before save:",
      JSON.stringify(updateData, null, 2),
    );

    let product;
    let isNew = false;
    const existingId = toObjectId(_id);
    if (existingId) {
      const existing = await Product.findById(existingId);
      if (existing) {
        product = await Product.findOneAndUpdate(
          { _id: existingId },
          { $set: updateData },
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
      const createData = {
        ...updateData,
        createdAt: new Date(),
      };
      const newProduct = new Product(createData);
      product = await newProduct.save();
      if (!product) {
        return { success: false, error: "Failed to create product" };
      }
    }

    revalidatePath("/products");
    const result = product?.toObject ? product?.toObject() : product;
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    console.error("Error in createOrUpdateProduct:", error);
    return { success: false, error: message || "Failed to save product" };
  }
}

// ---------- deleteProduct ----------
export async function deleteProduct(
  id: string,
  options: DeleteProductOptions = {},
): Promise<ProductResponse> {
  try {
    await connection();
    if (!id) return { success: false, error: "Product ID is required" };
    const existingProduct = await Product.findById(id);
    if (!existingProduct) return { success: false, error: "Product not found" };

    await Product.updateMany(
      { "relatedProducts.product": new mongoose.Types.ObjectId(id) },
      {
        $pull: {
          relatedProducts: { product: new mongoose.Types.ObjectId(id) },
        },
      },
    );

    if (options.recreate) {
      const clone = existingProduct.toObject
        ? existingProduct.toObject()
        : existingProduct;
      const { _id, __v, createdAt, updatedAt, ...rest } = clone;
      const recreatedProduct = new Product({
        ...rest,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const savedProduct = await recreatedProduct.save();
      await Product.findByIdAndDelete(id);
      revalidatePath("/products");
      return {
        success: true,
        data: {
          deletedId: id,
          recreatedId: savedProduct._id.toString(),
          product: savedProduct.toObject(),
        },
      };
    }

    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) return { success: false, error: "Product not found" };
    revalidatePath("/products");
    return { success: true, data: "Product deleted successfully" };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}

// ---------- deleteProductImages ----------
export async function deleteProductImages(
  productId: string,
  imageUrl?: string,
): Promise<ProductResponse> {
  try {
    await connection();
    if (!productId && !imageUrl) {
      return { success: false, error: "ProductId or imageUrl is required" };
    }
    const deleteFromStorage = async (url: string) => {
      const urlObj = new URL(url);
      const encodedFileName = urlObj.pathname.split("/").pop();
      if (encodedFileName) {
        const fileName = decodeURIComponent(encodedFileName);
        const path = fileName.startsWith("uploads/")
          ? fileName
          : `uploads/${fileName}`;
        await deleteObject(ref(storage, path));
      }
    };
    if (productId && mongoose.isValidObjectId(productId)) {
      const product = await Product.findById(productId);
      if (!product) return { success: false, error: "Product not found" };
      if (imageUrl) {
        const productImages = product.images ?? [];
        if (!productImages.includes(imageUrl)) {
          return { success: false, error: "Image URL not found in product" };
        }
        await deleteFromStorage(imageUrl);
        product.images = productImages.filter(
          (url: string) => url !== imageUrl,
        );
        await product.save();
        return { success: true, data: product.toObject() };
      }
    } else if (imageUrl) {
      await deleteFromStorage(imageUrl);
      return { success: true, data: "Image deleted successfully" };
    }
    return { success: false, error: "Invalid parameters" };
  } catch (error) {
    console.error("Error deleting product images:", error);
    return { success: false, error: "Failed to delete product images" };
  }
}
