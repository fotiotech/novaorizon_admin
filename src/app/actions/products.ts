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

// ---------- Helper: Deep Serialize ----------
function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Handle Mongoose ObjectId
  if (
    obj instanceof mongoose.Types.ObjectId ||
    obj._bsontype === "ObjectId" ||
    typeof obj.toHexString === "function"
  ) {
    return obj.toString();
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serialize);
  }

  // Handle plain objects
  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serialize(obj[key]);
    }
    return result;
  }

  // Primitives
  return obj;
}

// ---------- Types ----------
export interface CreateProductForm {
  category_id: string;
  brand: string;
  name?: string;
  department?: string;
  related_products?: { ids: string[] };
  [key: string]: any;
}

interface ProductResponse {
  success: boolean;
  data?: any;
  error?: string;
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

function generateSlug(name: string, department: string | null): string {
  return slugify(`${name}${department ? `-${department}` : ""}`, {
    lower: true,
  });
}

function generateDsin(): string {
  return Array(10)
    .fill(null)
    .map(
      () =>
        "ABCDEFGHIJKLMNOPQRSTUVWYZ0123456789"[Math.floor(Math.random() * 35)],
    )
    .join("");
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
          path: "related_products.ids",
          select: "name list_price main_image slug",
          options: { strictPopulate: false },
        })
        .lean()
        .exec();

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      // Serialize everything recursively
      return serialize(product);
    }

    // For multiple products (no id)
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
    const { category_id, brand, related_products, ...attributes } = formData;

    if (!category_id) {
      return { success: false, error: "Valid category_id is required" };
    }
    if (!brand) {
      return { success: false, error: "Valid brand is required" };
    }

    const cleanedAttributes = cleanObject(attributes);
    if (Object.keys(cleanedAttributes).length === 0) {
      return { success: false, error: "At least one attribute is required" };
    }

    const dsin = generateDsin();
    const updateData: any = {
      category_id: new mongoose.Types.ObjectId(category_id),
      brand: new mongoose.Types.ObjectId(brand),
      ...cleanedAttributes,
      slug: attributes.name
        ? generateSlug(attributes.name, attributes.department ?? null)
        : undefined,
      dsin,
      updatedAt: new Date(),
    };

    if (related_products?.ids) {
      updateData.related_products = {
        ids: related_products.ids.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    await Product.findOneAndUpdate(
      { dsin },
      {
        $set: updateData,
        $setOnInsert: { createdAt: new Date() },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error creating product:", error);
    return { success: false, error: "Failed to create product" };
  }
}

export async function updateProduct(
  productId: string,
  formData: any,
): Promise<ProductResponse> {
  try {
    await connection();
    const {
      category_id,
      brand,
      related_products,
      quantity,
      lowStockThreshold,
      ...attributes
    } = formData;

    if (!productId) {
      return { success: false, error: "Valid product ID is required" };
    }

    const cleanedAttributes = cleanObject(attributes);
    if (
      Object.keys(cleanedAttributes).length === 0 &&
      !category_id &&
      !brand &&
      !related_products &&
      quantity === undefined &&
      lowStockThreshold === undefined
    ) {
      return { success: false, error: "No valid attributes provided" };
    }

    const updateData: any = { ...cleanedAttributes, updatedAt: new Date() };

    if (category_id) {
      updateData.category_id = new mongoose.Types.ObjectId(category_id);
    }
    if (brand) {
      updateData.brand = new mongoose.Types.ObjectId(brand);
    }
    if (related_products) {
      updateData.related_products = {
        ids: related_products.ids?.map(
          (id: string) => new mongoose.Types.ObjectId(id),
        ),
      };
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
    // Return serialized version
    return { success: true, data: serialize(updatedProduct.toObject()) };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: "Failed to update product" };
  }
}

export async function createOrUpdateProduct(
  productData: any,
): Promise<ProductResponse> {
  try {
    await connection();

    const {
      _id,
      category_id,
      brand,
      related_products,
      quantity,
      lowStockThreshold,
      ...attributes
    } = productData;

    // Clean the attributes – remove null/undefined/empty strings
    const cleanedAttributes = cleanObject(attributes);

    // Exclude system fields that should not be updated
    const { createdAt, updatedAt, __v, dsin, ...safeAttributes } =
      cleanedAttributes;

    // Build update data
    const updateData: any = {
      ...safeAttributes,
      updatedAt: new Date(), // always set updatedAt
    };

    // Convert category_id
    const categoryObjectId = toObjectId(category_id);
    if (categoryObjectId) {
      updateData.category_id = categoryObjectId;
    }

    // Convert brand
    const brandObjectId = toObjectId(brand);
    if (brandObjectId) {
      updateData.brand = brandObjectId;
    }

    // ---- FIX: always set related_products if field is provided ----
    if (related_products !== undefined) {
      const validIds = (related_products.ids || [])
        .map((id: any) => toObjectId(id))
        .filter((id: any) => id !== null);
      updateData.related_products = { ids: validIds };
    }

    // Quantity & threshold
    if (quantity !== undefined) {
      updateData.quantity = Number(quantity);
    }
    if (lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = Number(lowStockThreshold);
    }

    // Regenerate slug if name changed
    if (safeAttributes.name) {
      updateData.slug = generateSlug(
        safeAttributes.name,
        safeAttributes.department ?? null,
      );
    }

    let product;
    let isNew = false;

    // Check if we have a valid _id and it exists in DB
    const existingId = toObjectId(_id);
    if (existingId) {
      const existing = await Product.findById(existingId);
      if (existing) {
        // UPDATE
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

    // CREATE
    if (isNew) {
      const createData = {
        ...updateData,
        createdAt: new Date(),
        dsin: generateDsin(),
      };
      const newProduct = new Product(createData);
      product = await newProduct.save();
      if (!product) {
        return { success: false, error: "Failed to create product" };
      }
    }

    revalidatePath("/products");

    // Convert to plain object and serialize
    const result = product.toObject ? product.toObject() : product;
    return { success: true, data: serialize(result) };
  } catch (error) {
    console.error("Error in createOrUpdateProduct:", error);
    return { success: false, error: "Failed to save product" };
  }
}

export async function deleteProduct(id: string): Promise<ProductResponse> {
  try {
    await connection();
    if (!id) {
      return { success: false, error: "Product ID is required" };
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
        if (!product.imageUrls.includes(imageUrl)) {
          return { success: false, error: "Image URL not found in product" };
        }

        await deleteFromStorage(imageUrl);
        product.imageUrls = product.imageUrls.filter(
          (url: string) => url !== imageUrl,
        );
        await product.save();
        // Return serialized product
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
