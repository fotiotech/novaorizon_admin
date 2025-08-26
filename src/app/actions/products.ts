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
    console.log(products);

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

function cleanObject<T extends Record<string, any>>(
  obj: T | undefined
): T | undefined {
  if (!obj || typeof obj !== "object") return undefined;

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value != null && !(typeof value === "string" && !value.trim())) {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length ? cleaned : undefined;
}

export async function createProduct(formData: CreateProductForm) {
  const { category_id, attributes } = formData;


  if (!category_id) throw new Error("Valid category_id is required.");

  const cleanedAttributes = cleanObject(attributes);
  if (!cleanedAttributes)
    throw new Error("At least one attribute is required.");

  const docData = {
    category_id: new mongoose.Types.ObjectId(category_id),
    attributes: cleanedAttributes,
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const prodDoc = await Product.create([docData], { session });
    await session.commitTransaction();
  console.log({ prodDoc });

    revalidatePath("/admin/products/products_list");
    return {
      ...prodDoc[0].toObject(),
      _id: prodDoc[0]._id.toString(),
      category_id: prodDoc[0].category_id.toString(),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function updateProduct(productId: string, formData: any) {
  const { attributes } = formData;

  if (!productId) throw new Error("Valid product ID is required.");
  if (typeof attributes !== "object")
    throw new Error("Attributes object is required.");

  const cleanedAttributes = cleanObject(attributes);
  if (!cleanedAttributes) throw new Error("No valid attributes provided.");

  const doc = await Product.findById(productId);
  if (!doc) throw new Error(`Product ${productId} not found.`);

  doc.attributes = { ...doc.attributes, ...cleanedAttributes };
  await doc.save();

  revalidatePath("/admin/products/products_list");
  return doc.toObject();
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
