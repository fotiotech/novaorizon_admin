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

// Types
export interface CreateProductForm {
  category_id: string;
  name?: string;
  department?: string;
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

// CRUD Operations
export async function findProducts(id?: string) {
  try {
    await connection();

    const buildGroupTreeWithValues = (
      groups: any[],
      product: any,
      parentId: string | null = null
    ): any[] => {
      return groups
        .filter(
          (group) =>
            (!parentId && !group.parent_id) ||
            (parentId && group.parent_id?.toString() === parentId)
        )
        .sort((a, b) => a.group_order - b.group_order)
        .map((group) => {
          const attributesWithValues = group.attributes
            ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((attr: any) => {
              const value = product[attr.code];
              return value != null
                ? {
                    _id: attr._id,
                    code: attr.code,
                    name: attr.name,
                    type: attr.type,
                    option: attr.option,
                    [attr.code]: value,
                  }
                : null;
            });
          const children = buildGroupTreeWithValues(
            groups,
            product,
            group?._id?.toString()
          );

          if (attributesWithValues && attributesWithValues.length > 0) {
            return {
              _id: group?._id?.toString(),
              code: group.code,
              name: group.name,
              parent_id: group?.parent_id?.toString(),
              group_order: group.group_order,
              attributes: attributesWithValues,
              children,
            };
          }
        });
    };

    const groups = await AttributeGroup.find()
      .populate("attributes")
      .sort({ group_order: 1 })
      .lean()
      .exec();

    if (id) {
      const product: any = await Product.findById(id).lean().exec();
      if (!product) {
        return { success: false, error: "Product not found" };
      }
      return {
        product,
        _id: product?._id,
        category_id: product?.category_id,
        rootGroup: buildGroupTreeWithValues(groups, product),
      };
    }

    const products = await Product.find().sort({ createdAt: -1 }).lean().exec();
    if (!products) {
      console.error("No products found");
    }
    const productsWithGroups = products.map((product) => {
      const rootGroup = buildGroupTreeWithValues(groups, product);
      return {
        // ...product,
        _id: product?._id?.toString(),
        category_id: product?.category_id?.toString(),
        rootGroup,
      };
    });
    console.log("Products with groups:", productsWithGroups);
    return productsWithGroups;
  } catch (error) {
    console.error("Error finding products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

export async function createProduct(
  formData: CreateProductForm
): Promise<ProductResponse> {
  const session = await mongoose.startSession();

  try {
    await connection();
    const { category_id, ...attributes } = formData;

    if (!category_id) {
      return { success: false, error: "Valid category_id is required" };
    }

    const cleanedAttributes = cleanObject(attributes);
    if (Object.keys(cleanedAttributes).length === 0) {
      return { success: false, error: "At least one attribute is required" };
    }

    session.startTransaction();

    const product = await Product.create(
      [
        {
          category_id: new mongoose.Types.ObjectId(category_id),
          ...cleanedAttributes,
          slug: attributes.name
            ? generateSlug(attributes.name, attributes.department ?? null)
            : undefined,
          dsin: generateDsin(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    revalidatePath("/admin/products/products_list");

    return { success: true, data: product[0] };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error creating product:", error);
    return { success: false, error: "Failed to create product" };
  } finally {
    session.endSession();
  }
}

export async function updateProduct(
  productId: string,
  formData: any
): Promise<any> {
  try {
    await connection();
    const { category_id, ...attributes } = formData;

    if (!productId) {
      return { success: false, error: "Valid product ID is required" };
    }

    const cleanedAttributes = cleanObject(attributes);
    if (Object.keys(cleanedAttributes).length === 0) {
      return { success: false, error: "No valid attributes provided" };
    }

    const product = await Product.findById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    Object.assign(product, cleanedAttributes);

    if (category_id) {
      product.category_id = new mongoose.Types.ObjectId(category_id);
    }

    if (attributes.name) {
      product.slug = generateSlug(
        attributes.name ?? "",
        attributes.department ?? null
      );
    }

    product.updatedAt = new Date();
    await product.save();

    revalidatePath("/admin/products/products_list");
    return { success: true, data: product };
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

    revalidatePath("/admin/products/products_list");
    return { success: true, data: "Product deleted successfully" };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}

export async function deleteProductImages(
  productId: string,
  imageUrl?: string
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

    if (mongoose.isValidObjectId(productId)) {
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
      }
    } else if (imageUrl) {
      await deleteFromStorage(imageUrl);
    }

    return { success: true, data: "Images deleted successfully" };
  } catch (error) {
    console.error("Error deleting product images:", error);
    return { success: false, error: "Failed to delete product images" };
  }
}
