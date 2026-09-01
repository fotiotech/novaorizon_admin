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
import {
  transformSnakeToCamel,
  transformCamelToSnake,
  flattenCategoryProperty,
  mergeCategoryPropertyToProduct,
} from "@/lib/categoryProperty";

// ---------- Helper: Deep Serialize ----------
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

function addLegacyProductAliases(product: any): any {
  if (!product || typeof product !== "object") return product;

  const result = { ...product };
  result.title ??= result.name ?? "";
  result.name ??= result.title ?? "";
  result.model ??=
    Array.isArray(result.productCode) && result.productCode.length
      ? (result.productCode[0]?.value ?? "")
      : "";
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
  related_products?: { id: string; relationship_type: string }[]; // updated
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
    // Ignore category metadata lookup failures so existing product flows remain compatible
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
  if (candidate === null || candidate === undefined || candidate === "") {
    return null;
  }

  const stringValue =
    typeof candidate === "string" ? candidate.trim() : String(candidate);
  if (mongoose.Types.ObjectId.isValid(stringValue)) {
    return new mongoose.Types.ObjectId(stringValue);
  }
  return null;
}

function normalizeReferenceId(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    return mongoose.Types.ObjectId.isValid(value) ? value : null;
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }
  if (typeof value === "object") {
    if (value._id) return normalizeReferenceId(value._id);
    if (value.toString && value.toString() !== "[object Object]") {
      const stringValue = value.toString();
      return mongoose.Types.ObjectId.isValid(stringValue) ? stringValue : null;
    }
  }
  return null;
}

async function hydrateProductReferences<T extends Record<string, any>>(
  products: T[],
) {
  const brandIds = Array.from(
    new Set(
      products
        .map((product) => normalizeReferenceId((product as any).brand))
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const categoryIds = Array.from(
    new Set(
      products
        .map((product) => normalizeReferenceId((product as any).categoryId))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [brandDocs, categoryDocs] = await Promise.all([
    brandIds.length
      ? Brand.find({
          _id: { $in: brandIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
          .select("_id name")
          .lean()
          .exec()
      : [],
    categoryIds.length
      ? Category.find({
          _id: {
            $in: categoryIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        })
          .select("_id name")
          .lean()
          .exec()
      : [],
  ]);

  const brandMap = new Map(
    (brandDocs as any[]).map((brand) => [
      brand._id.toString(),
      { _id: brand._id.toString(), name: brand.name },
    ]),
  );
  const categoryMap = new Map(
    (categoryDocs as any[]).map((category) => [
      category._id.toString(),
      { _id: category._id.toString(), name: category.name },
    ]),
  );

  return products.map((product) => {
    const productWithRefs: Record<string, any> = { ...product };

    const brandRaw = (product as any).brand;
    const brandId = normalizeReferenceId(brandRaw);
    productWithRefs.brand = brandId
      ? (brandMap.get(brandId) ?? brandRaw)
      : null;

    const categoryRaw = (product as any).categoryId;
    const categoryId = normalizeReferenceId(categoryRaw);
    productWithRefs.categoryId = categoryId
      ? (categoryMap.get(categoryId) ?? categoryRaw)
      : null;

    return productWithRefs as T;
  });
}

// ---------- Server Actions ----------
export async function findProducts(id?: string) {
  try {
    await connection();

    if (id) {
      const product = await Product.findById(id).lean().exec();

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      const hydratedProduct = (await hydrateProductReferences([product]))[0];
      return addLegacyProductAliases(serialize(hydratedProduct));
    }

    const products = await Product.find().sort({ createdAt: -1 }).lean().exec();

    if (!products) {
      console.error("No products found");
      return [];
    }

    const hydratedProducts = await hydrateProductReferences(products);
    console.log(
      `Fetched ${hydratedProducts.length} products from the database.`,
    );

    return (serialize(hydratedProducts) as any[]).map(addLegacyProductAliases);
  } catch (error) {
    console.error("Error finding products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

export async function createProduct(
  formData: CreateProductForm,
): Promise<ProductResponse> {
  try {
    await connection();

    const normalizedIncoming = normalizeProductPayloadForValidation(formData);
    const transformedData = transformSnakeToCamel(normalizedIncoming);
    const canonicalData = finalizeCanonicalProductData(transformedData);

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
    } = validationResult.data || transformedData;

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

    if (relatedProducts) {
      // Convert each id to ObjectId and keep relationshipType
      updateData.relatedProducts = (relatedProducts as any[]).map((rp) => ({
        id: new mongoose.Types.ObjectId(rp.id),
        relationshipType: rp.relationshipType || "",
      }));
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

    const transformedData = transformSnakeToCamel(normalizedIncoming);
    const canonicalData = finalizeCanonicalProductData(transformedData);

    if (categoryOnlyUpdate) {
      const categoryId = canonicalData.categoryId ?? canonicalData.category_id;

      if (!productId) {
        return { success: false, error: "Valid product ID is required" };
      }
      if (!categoryId) {
        return { success: false, error: "Category is required" };
      }

      const updateData: any = {
        categoryId: new mongoose.Types.ObjectId(categoryId),
        updatedAt: new Date(),
      };

      const updatedProduct = await Product.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(productId) },
        updateData,
        { new: true, runValidators: true },
      );

      if (!updatedProduct) {
        return { success: false, error: "Product not found" };
      }

      revalidatePath("/products");
      return { success: true, data: serialize(updatedProduct.toObject()) };
    }

    // Validate with Zod schema
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

    if (!productId) {
      return { success: false, error: "Valid product ID is required" };
    }

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

    if (categoryId) {
      updateData.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
    if (brand) {
      updateData.brand = new mongoose.Types.ObjectId(brand);
    }
    if (relatedProducts) {
      updateData.relatedProducts = (relatedProducts as any[]).map(
        (rp: any) => ({
          id: new mongoose.Types.ObjectId(rp.id),
          relationshipType: rp.relationshipType || "",
        }),
      );
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

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(productId) },
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedProduct) {
      return { success: false, error: "Product not found" };
    }

    revalidatePath("/products");
    return { success: true, data: serialize(updatedProduct.toObject()) };
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
  if (candidate === null || candidate === undefined || candidate === "") {
    return null;
  }

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
    const statusValue = normalized.status.trim();
    normalized.status = statusValue.toLowerCase();
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

function finalizeCanonicalProductData(data: Record<string, any>) {
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

  if (canonicalData.variantValues !== undefined) {
    canonicalData.variantValues = normalizeKeyValueCollection(
      canonicalData.variantValues,
    );
  }
  if (canonicalData.keyFeatures !== undefined) {
    canonicalData.keyFeatures = normalizeKeyValueCollection(
      canonicalData.keyFeatures,
    );
  }

  if (typeof canonicalData.status === "string") {
    canonicalData.status = canonicalData.status.trim().toLowerCase();
  }

  return canonicalData;
}

export async function createOrUpdateProduct(
  productData: any,
): Promise<ProductResponse> {
  try {
    await connection();

    const normalizedIncoming =
      normalizeProductPayloadForValidation(productData);
    const transformedData = transformSnakeToCamel(normalizedIncoming);
    const canonicalData = finalizeCanonicalProductData(transformedData);

    const validationResult = safeValidateProductCreateOrUpdate(canonicalData);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Validation failed: ${validationResult.error}`,
      };
    }

    const {
      _id,
      categoryId,
      brand,
      relatedProducts,
      quantity,
      lowStockThreshold,
      ...attributes
    } = validationResult.data || canonicalData;

    const cleanedAttributes = cleanObject(attributes);
    const { createdAt, updatedAt, __v, ...safeAttributes } = cleanedAttributes;

    if (categoryId) {
      try {
        await validateRequiredCategoryAttributes(categoryId, {
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
      status: normalizeProductStatus(safeAttributes.status as string),
      updatedAt: new Date(),
    };

    const categoryObjectId = toObjectId(categoryId);
    if (!categoryObjectId) {
      return { success: false, error: "Invalid category selected." };
    }
    updateData.categoryId = categoryObjectId;

    const brandObjectId = toObjectId(brand);
    if (!brandObjectId) {
      return { success: false, error: "Invalid brand selected." };
    }
    updateData.brand = brandObjectId;

    // Handle relatedProducts – now expects array of objects
    if (relatedProducts !== undefined) {
      if (Array.isArray(relatedProducts)) {
        const validRelatedProducts = (relatedProducts as any[])
          .filter((rp: any) => rp && rp.id)
          .map((rp: any) => ({
            id: toObjectId(rp.id),
            relationshipType: rp.relationshipType || "",
          }))
          .filter((rp: any) => rp.id);

        if (validRelatedProducts.length > 0) {
          updateData.relatedProducts = validRelatedProducts;
        }
      } else {
        // fallback for old format (just in case)
        const ids = (relatedProducts as any).ids || [];
        const validRelatedProducts = ids
          .filter((id: any) => id)
          .map((id: any) => ({
            id: toObjectId(id),
            relationshipType: (relatedProducts as any).relationshipType || "",
          }))
          .filter((rp: any) => rp.id);

        if (validRelatedProducts.length > 0) {
          updateData.relatedProducts = validRelatedProducts;
        }
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
    return { success: true, data: serialize(result) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    console.error("Error in createOrUpdateProduct:", error);
    return {
      success: false,
      error: message || "Failed to save product",
    };
  }
}

export async function deleteProduct(
  id: string,
  options: DeleteProductOptions = {},
): Promise<ProductResponse> {
  try {
    await connection();
    if (!id) {
      return { success: false, error: "Product ID is required" };
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return { success: false, error: "Product not found" };
    }

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
          product: serialize(savedProduct.toObject()),
        },
      };
    }

    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return { success: false, error: "Product not found" };
    }
    revalidatePath("/products");
    return { success: true, data: "Product deleted successfully" };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}

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
      if (!product) {
        return { success: false, error: "Product not found" };
      }

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
        return { success: true, data: serialize(product.toObject()) };
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
