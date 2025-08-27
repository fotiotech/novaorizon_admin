"use server";
import { connection } from "@/utils/connection";

import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { ref, deleteObject } from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";
import mongoose from "mongoose";
import Product from "@/models/Product";
import AttributeGroup from "@/models/AttributesGroup";
import "@/models/Attribute";
import "@/models/Brand";
import "@/models/User";
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

export interface CreateProductForm {
  category_id: string;
  [key: string]: any; // Allow any additional fields
}

function cleanObject<T extends Record<string, any>>(
  obj: T | undefined
): T | undefined {
  if (!obj || typeof obj !== "object") return undefined;

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value != null && !(typeof value === "string" && !value.trim())) {
      if (key === "attributes" && typeof value === "object") {
        // flatten attributes into top-level
        Object.assign(cleaned, value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return Object.keys(cleaned).length ? cleaned : undefined;
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

  const buildGroupTreeWithValues = (
    groups: any[],
    product: any,
    parentId: string | null = null
  ): any => {
    return groups
      .filter(
        (group) =>
          (!parentId && !group.parent_id) ||
          (parentId &&
            group.parent_id &&
            group.parent_id.toString() === parentId)
      )
      .sort((a, b) => a.group_order - b.group_order)
      .map((group) => {
        const attributesWithValues = (group.attributes || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((attr: any) => {
            const value = product[attr.code] ?? null;
            return value !== null && value !== undefined
              ? {
                  _id: attr._id,
                  code: attr.code,
                  [attr.code]: value,
                  name: attr.name,
                }
              : null;
          })
          .filter(Boolean);

        const children = buildGroupTreeWithValues(
          groups,
          product,
          group._id.toString()
        );

        return attributesWithValues.length > 0 || children.length > 0
          ? {
              _id: group._id,
              code: group.code,
              name: group.name,
              parent_id: group.parent_id,
              group_order: group.group_order,
              attributes: attributesWithValues,
              children,
            }
          : null;
      })
      .filter(Boolean);
  };

  if (id) {
    const product = await Product.findOne({ _id: id }).exec();
    if (!product) return null;

    const groups = await AttributeGroup.find()
      .populate({ path: "attributes" })
      .sort({ group_order: 1 })
      .exec();

    const productObj = product.toObject();
    const rootGroup = buildGroupTreeWithValues(groups, productObj || {});

    return {
      ...productObj,
      rootGroup,
    };
  } else {
    const products = await Product.find().sort({ createdAt: -1 }).exec();

    const groups = await AttributeGroup.find()
      .populate({ path: "attributes" })
      .sort({ group_order: 1 })
      .exec();

    return products.map((product) => {
      const productObj = product.toObject();
      const rootGroup = buildGroupTreeWithValues(groups, productObj || {});

      return {
        ...productObj,
        rootGroup,
      };
    });
  }
}

export async function createProduct(formData: CreateProductForm) {
  await connection();
  const { category_id, ...attributes } = formData;

  if (!category_id) throw new Error("Valid category_id is required.");

  const cleanedAttributes = cleanObject(attributes);
  if (!cleanedAttributes)
    throw new Error("At least one attribute is required.");

  const docData = {
    category_id: new mongoose.Types.ObjectId(category_id),
    ...cleanedAttributes, // Spread attributes as top-level fields
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const r = await Product.create([docData], { session });
    await session.commitTransaction();
    revalidatePath("/admin/products/products_list");
    return {
      ok: true,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function updateProduct(productId: string, formData: any) {
  await connection();
  const { category_id, ...attributes } = formData;

  if (!productId) throw new Error("Valid product ID is required.");

  const cleanedAttributes = cleanObject(attributes);
  if (!cleanedAttributes) throw new Error("No valid attributes provided.");

  const doc = await Product.findById(productId);
  if (!doc) throw new Error(`Product ${productId} not found.`);

  // Update fields directly instead of nesting under attributes
  for (const [key, value] of Object.entries(cleanedAttributes)) {
    doc[key] = value;
  }

  // Ensure updatedAt is set correctly
  doc.updatedAt = new Date();

  // Update category_id if provided
  if (category_id) {
    doc.category_id = new mongoose.Types.ObjectId(category_id);
  }

  try {
    await doc.save();
    console.log("Product updated:", doc);
    revalidatePath("/admin/products/products_list");
    return { ok: true };
  } catch (validationError: any) {
    throw new Error(
      `Validation failed: ${validationError.message || validationError}`
    );
  }
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
