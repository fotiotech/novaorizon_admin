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

// Types
export interface CreateProductForm {
  category_id: string;
  brand: string;
  name?: string;
  department?: string;
  related_products?: {
    ids: string[];
  };
  [key: string]: any;
}

interface ProductResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Helper Functions
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
        "ABCDEFGHIJKLMNOPQRSTUVWYZ0123456789"[Math.floor(Math.random() * 35)]
    )
    .join("");
}

export async function findProducts(id?: string) {
  try {
    await connection();

    if (id) {
      const product: any = await Product.findById(id)
        .populate({
          path: "brand",
          select: "name",
          options: { strictPopulate: false },
        }) // Populate brand name
        .populate({
          path: "category_id",
          select: "_id name",
          options: { strictPopulate: false },
        }) // Populate category name
        .populate({
          path: "related_products.ids",
          select: "name list_price main_image slug", // Select fields for related products
          options: { strictPopulate: false },
        })
        .lean()
        .exec();

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      // Convert MongoDB ObjectIds to strings for the main product
      const result = {
        ...product,
        _id: product._id?.toString(),
        category_id:
          product.category_id?._id?.toString() ||
          product.category_id?.toString(),
        brand: product.brand?._id?.toString() || product.brand?.toString(),
      };

      // If related products exist, convert their IDs to strings
      if (result.related_products?.ids) {
        result.related_products.ids = result.related_products.ids.map(
          (relatedProduct: any) => ({
            ...relatedProduct,
            _id: relatedProduct._id?.toString(),
            category_id: relatedProduct.category_id?.toString(),
          })
        );
      }

      return result;
    }

    const products = await Product.find()
      .populate({
        path: "brand",
        select: "name",
        options: { strictPopulate: false },
      }) // Populate brand name
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
    }

    return products.map((product: any) => ({
      ...product,
      _id: product._id?.toString(),
      category_id:
        product.category_id?._id?.toString() || product.category_id?.toString(),
      brand: product.brand?._id?.toString() || product.brand?.toString(),
    }));
  } catch (error) {
    console.error("Error finding products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

export async function createProduct(
  formData: CreateProductForm
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

    // Generate a unique identifier for upsert operation
    const dsin = generateDsin();

    // Prepare update data
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

    // Handle related products if provided
    if (related_products?.ids) {
      updateData.related_products = {
        ids: related_products?.ids?.map(
          (id) => new mongoose.Types.ObjectId(id)
        ),
      };
    }

    // Use findOneAndUpdate with upsert to create or update
    await Product.findOneAndUpdate(
      { dsin }, // Use a unique field to find if product exists
      {
        $set: updateData,
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        upsert: true, // Create if doesn't exist
        new: true, // Return the updated document
        runValidators: true, // Run schema validators
      }
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
  formData: any
): Promise<any> {
  try {
    await connection();
    const { category_id, brand, related_products, ...attributes } = formData;

    if (!productId) {
      return { success: false, error: "Valid product ID is required" };
    }

    console.log({ formData });

    const cleanedAttributes = cleanObject(attributes);
    if (
      Object.keys(cleanedAttributes).length === 0 &&
      !category_id &&
      !brand &&
      !related_products
    ) {
      return { success: false, error: "No valid attributes provided" };
    }

    // Create update object
    const updateData: any = { ...cleanedAttributes, updatedAt: new Date() };

    // Handle category_id if provided
    if (category_id) {
      updateData.category_id = new mongoose.Types.ObjectId(category_id);
    }

    // Handle brand if provided
    if (brand) {
      updateData.brand = new mongoose.Types.ObjectId(brand);
    }

    // Handle related_products if provided
    if (related_products) {
      updateData.related_products = {
        ids: related_products?.ids?.map(
          (id: string) => new mongoose.Types.ObjectId(id)
        ),
      };
    }

    // Handle slug generation if name is provided
    if (attributes.name) {
      updateData.slug = generateSlug(
        attributes.name,
        attributes.department ?? null
      );
    }

    // Use findOneAndUpdate to directly update the document
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(productId) },
      updateData,
      { new: true, runValidators: true } // Return the updated document and run validators
    );

    if (!updatedProduct) {
      return { success: false, error: "Product not found" };
    }

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: "Failed to update product" };
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

interface ProductResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function deleteProductImages(
  productId: string,
  imageUrl?: string
): Promise<ProductResponse> {
  try {
    await connection(); // Ensure database connection

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
          (url: string) => url !== imageUrl
        );
        await product.save();
        return { success: true, data: product };
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
