// app/actions/products.ts

"use server";

import { connection } from "@/utils/connection";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { ref, deleteObject } from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";
import mongoose from "mongoose";
import Product from "@/models/Product";
import "@/models/Attribute";
import "@/models/Category";
import "@/models/Brand";
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

    const missing: string[] = [];
    for (const code of requiredCodes) {
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

function toObjectId(value: any): mongoose.Types.ObjectId | null {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === "object" && value._id) {
    return toObjectId(value._id);
  }
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
}

// ---------- Server Actions ----------
export async function findProducts(id?: string) {
  try {
    await connection();

    if (id) {
      const product = await Product.findById(id)
        .populate({
          path: "brand",
          select: "name",
          options: { strictPopulate: false },
        })
        .populate({
          path: "category_id",
          select: "_id name",
          options: { strictPopulate: false },
        })
        .populate({
          path: "related_products.id", // populate the product details
          select: "name list_price main_image slug",
          options: { strictPopulate: false },
        })
        .lean()
        .exec();

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      return serialize(product);
    }

    const products = await Product.find()
      .populate({
        path: "brand",
        select: "name",
        options: { strictPopulate: false },
      })
      .populate({
        path: "category_id",
        select: "_id name",
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!products) {
      console.error("No products found");
      return [];
    }

    return serialize(products);
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

    // Convert snake_case keys to camelCase if needed
    const transformedData = transformSnakeToCamel(formData);

    // Validate with Zod schema
    const validationResult = safeValidateProductCreate(transformedData);
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

    // Convert snake_case keys to camelCase if needed
    const transformedData = transformSnakeToCamel(formData);

    // Validate with Zod schema
    const validationResult = safeValidateProductUpdate(transformedData);
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

export async function createOrUpdateProduct(
  productData: any,
): Promise<ProductResponse> {
  try {
    await connection();

    // Convert snake_case keys to camelCase if needed
    const transformedData = transformSnakeToCamel(productData);

    // Validate with Zod schema
    const validationResult = safeValidateProductCreateOrUpdate(transformedData);
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
    } = validationResult.data || transformedData;

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
