"use server";
import { connection } from "@/utils/connection";

import "@/models/Brand";
import "@/models/User";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { VariantAttribute } from "@/models/VariantAttributes";
import { ref, deleteObject } from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";
import mongoose from "mongoose";
import Product from "@/models/Product";

// Generate a slug from the product name and department
function generateSlug(name: string, department: string | null) {
  return slugify(`${name}${department ? `-${department}` : ""}`, {
    lower: true,
  });
}

// Generate a random DSIN (Digital Serial Identification Number)
function generateDsin() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWYZ0123456789";
  let dsin = "";
  for (let i = 0; i < 10; i++) {
    dsin += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return dsin;
}

export async function getProductsByAttributes(filters: {
  brand?: string;
  priceRange?: [number, number];
  tags?: string[];
}) {
  await connection();

  const query: any = {};

  if (filters.brand) query.brand = filters.brand;
  if (filters.priceRange)
    query.price = { $gte: filters.priceRange[0], $lte: filters.priceRange[1] };
  if (filters.tags && filters.tags.length > 0)
    query.tags = { $in: filters.tags };

  const products = await Product.find(query).populate("tags", "name");
  return products;
}

export async function findProducts(id?: string) {
  await connection();

  if (id) {
    const product = await Product.findOne({ _id: id }).exec();

    if (!product) return null;

    return {
      ...product?.toObject(),
      _id: product._id.toString(),
      category_id: product.category_id?.toString() ?? null,
      ...product?.attributes,
    };
  } else {
    const products = await Product.find().sort({ created_at: -1 }).exec();

    return products.map((doc) => ({
      ...doc.toObject(),
      _id: doc._id.toString(),
      category_id: doc.category_id?.toString() ?? null,
      ...doc?.attributes,
    }));
  }
}

export interface CreateProductForm {
  category_id: string;
  attributes?: Record<string, any>;
}

function cleanGroup<T extends Record<string, any>>(
  group: T | undefined
): T | undefined {
  if (!group || typeof group !== "object") return undefined;
  const out: any = {};
  Object.entries(group).forEach(([k, v]) => {
    const emptyString = typeof v === "string" && !v.trim();
    const emptyArray = Array.isArray(v) && v.length === 0;
    const nullish = v === null || v === undefined;
    if (!emptyString && !emptyArray && !nullish) {
      out[k] = v;
    }
  });
  return Object.keys(out).length ? out : undefined;
}

export async function createProduct(formData: CreateProductForm) {
  const { category_id, attributes } = formData;

  if (!category_id || typeof category_id !== "string") {
    throw new Error("A valid category_id is required.");
  }

  const docData: any = {
    category_id: new mongoose.Types.ObjectId(category_id),
  };

  const cleanedAttributes = cleanGroup(attributes);
  if (cleanedAttributes) {
    docData.attributes = cleanedAttributes;
  }

  if (!docData.attributes) {
    throw new Error("At least one attribute must be provided.");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const prodDoc = new Product(docData);
    await prodDoc.save({ session });

    await session.commitTransaction();
    revalidatePath("/admin/products/products_list");

    return {
      ...prodDoc.toObject(),
      _id: prodDoc._id.toString(),
      category_id: prodDoc.category_id.toString(),
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export interface UpdateProductForm {
  attributes?: Record<string, any>;
}

function cleanGroupUpdate<T extends Record<string, any> | any[]>(
  group: T | undefined
): T | undefined {
  if (group == null) return undefined;
  if (Array.isArray(group)) {
    const arr = group.filter((v) => v !== null && v !== undefined);
    return arr.length > 0 ? (arr as T) : undefined;
  }
  if (typeof group === "object") {
    const out: any = {};
    Object.entries(group).forEach(([k, v]) => {
      const emptyString = typeof v === "string" && !v.trim();
      const emptyArray = Array.isArray(v) && v.length === 0;
      const nullish = v === null || v === undefined;
      if (!emptyString && !emptyArray && !nullish) {
        out[k] = v;
      }
    });
    return Object.keys(out).length ? (out as T) : undefined;
  }
  return undefined;
}

export async function updateProduct(
  productId: string,
  formData: UpdateProductForm
) {
  const { attributes } = formData;

  if (!productId || typeof productId !== "string") {
    throw new Error("A valid product ID is required.");
  }
  if (!attributes || typeof attributes !== "object") {
    throw new Error("Attributes object is required.");
  }

  const cleanedAttributes = cleanGroupUpdate(attributes);
  if (!cleanedAttributes) {
    throw new Error("No valid attributes after cleaning.");
  }

  const objId = new mongoose.Types.ObjectId(productId);
  const doc = await Product.findById(objId);
  if (!doc) {
    throw new Error(`Product with ID ${productId} not found.`);
  }

  const existingAttrs = doc.attributes || {};
  doc.attributes = { ...existingAttrs, ...cleanedAttributes };

  const updated = await doc.save();

  // Optional: Revalidate path if needed
  revalidatePath("/admin/products/products_list");

  return updated.toObject();
}

export async function deleteProduct(id: string) {
  try {
    await connection();
    const deletedProduct = id ? await Product.findByIdAndDelete(id) : null;
    if (!deletedProduct) {
      throw new Error("Product not found");
    }

    await revalidatePath("/admin/products/products_list");

    return "Product deleted successfully";
  } catch (error) {
    console.error("Error deleting product:", error);
  }
}

function isUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export async function deleteProductImages(
  productId: string,
  imageUrl?: string
) {
  try {
    // Ensure database connection
    await connection();
    if (!productId && !imageUrl) {
      return { success: false, message: "No productId or imageUrl provided" };
    }
    // Validate the productId
    if (isUUID(productId)) {
      // Delete the image from Firebase Storage
      const url = imageUrl ? new URL(imageUrl) : new URL("");
      const encodedFileName = url.pathname.split("/").pop();
      if (encodedFileName) {
        const fileName = decodeURIComponent(encodedFileName);
        const storageRef = ref(
          storage,
          fileName.startsWith("uploads/") ? fileName : `uploads/${fileName}`
        );
        await deleteObject(storageRef);
      }
    } else if (mongoose.isValidObjectId(productId)) {
      // Find the product by ID
      const product = await Product.findById(productId);
      if (!product) {
        console.log("Product not found");
      }

      // If `imageUrl` is provided, delete the specific image
      if (imageUrl) {
        // Check if the image exists in the product's imageUrls
        if (!product.imageUrls.includes(imageUrl)) {
          console.log("Image URL not found in product");
        }

        // Remove the image URL from the product's imageUrls array
        product.imageUrls = product.imageUrls.filter(
          (url: string) => url !== imageUrl
        );

        // Delete the image from Firebase Storage
        const url = new URL(imageUrl);
        const encodedFileName = url.pathname.split("/").pop();
        if (encodedFileName) {
          const fileName = decodeURIComponent(encodedFileName);
          const storageRef = ref(
            storage,
            fileName.startsWith("uploads/") ? fileName : `uploads/${fileName}`
          );
          await deleteObject(storageRef);
        }

        // Save the updated product
        await product.save();
      }
    }
    // else {
    //   // If no `imageUrl` is provided, delete all images
    //   for (const url of product.imageUrls) {
    //     const fileUrl = new URL(url);
    //     const encodedFileName = fileUrl.pathname.split("/").pop();
    //     if (encodedFileName) {
    //       const fileName = decodeURIComponent(encodedFileName);
    //       const storageRef = ref(
    //         storage,
    //         fileName.startsWith("uploads/") ? fileName : `uploads/${fileName}`
    //       );
    //       await deleteObject(storageRef);
    //     }
    //   }

    //   // Clear the imageUrls array
    //   product.imageUrls = [];
    // }

    return { success: true, message: "Image(s) deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting product images:", error);
  }
}
