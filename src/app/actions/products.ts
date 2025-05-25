"use server";

import "@/models/Brand";
import { connection } from "@/utils/connection";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { Variant } from "@/models/Variant";
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
    const product = await Product.findOne({ _id: id })
      .populate("brand_id")
      .exec();

    if (!product) return null;

    const variantAttributes = await VariantAttribute.find({
      product_id: product._id,
    });

    const variants = await Promise.all(
      variantAttributes.map(async (attr) => {
        return await Variant.find({ product_id: attr._id });
      })
    );

    return {
      ...product.toObject(),
      _id: product._id.toString(),
      category_id: product.category_id?.toString() ?? null,
      brand_id: product.brand_id?._id
        ? {
            _id: product.brand_id._id.toString(),
            name: product.brand_id.name,
          }
        : null,
      attributes: product.attributes?.map((attr: any) => ({
        ...attr.toObject(),
        _id: attr._id?.toString(),
      })),
      variantAttributes: variantAttributes.map((attr: any) => ({
        ...attr.toObject(),
        _id: attr._id.toString(),
      })),
      variants: variants.flat().map((variant: any) => ({
        ...variant.toObject(),
        _id: variant._id.toString(),
        product_id: variant.product_id.toString(),
      })),
    };
  } else {
    const products = await Product.find()
      .sort({ created_at: -1 })
      // .populate("brand_id")
      .exec();

    return products;
  }
}

// Define return type for `findProductDetails`
interface ProductDetails {
  _id: string;
  category_id: string | null;
  brand_id: { _id: string; name: string } | null;
  attributes: Array<any>;
  variantAttributes: Array<any>;
  [key: string]: any;
}

export async function findProductDetails(
  dsin?: string
): Promise<ProductDetails | null> {
  try {
    // Ensure database connection is established
    await connection();

    if (dsin) {
      // Find product by dsin, and populate the brand information
      const product = await Product.findOne({ dsin }).populate(
        "brand_id",
        "name"
      );

      if (product) {
        // Find variant attributes related to the product
        const variantAttributes = await VariantAttribute.find({
          product_id: product._id,
        });

        console.log("Product details:", product);
        console.log("Variant attributes:", variantAttributes);

        // Return sanitized product details
        return {
          // Safely convert to object, and ensure proper conversion of fields
          ...product.toObject(),
          _id: product._id?.toString(),
          category_id: product.category_id?.toString() ?? null,
          brand_id: product.brand_id
            ? {
                _id: product.brand_id._id?.toString(),
                name: product.brand_id.name,
              }
            : null,
          variantAttributes: variantAttributes.map((variant: any) => ({
            ...variant.toObject(),
            _id: variant._id.toString(),
            product_id: variant.product_id.toString(),
          })),
        };
      }
    }

    // Return null if no product is found
    return null;
  } catch (error) {
    // Log the error for debugging
    console.error("Error fetching product details:", error);
    // Optionally, rethrow the error or return null
    throw new Error("Failed to fetch product details.");
  }
}

interface VariantDetails {
  _id: string;
  variantAttributesId: string;
  [key: string]: any;
}

export async function findVariantsAttributes(id: string) {
  await connection();
  if (id) {
    const res = await VariantAttribute.find({ id });
    return res;
  }
}

export async function findVariants(id: string) {
  await connection();
  if (id) {
    const res = await Variant.find({ id });
    return res;
  }
}

export async function findVariantDetails(
  product_id: string,
  variantName: string
): Promise<VariantDetails | null> {
  try {
    await connection();

    if (product_id && variantName) {
      const variant = await Variant.findOne(
        { product_id, variantName } // Ensure proper filtering
      );

      if (variant) {
        return {
          ...variant.toObject(),
          _id: variant?._id.toString(),
          product_id: variant.product_id?.toString(),
        };
      }
    }

    return null; // Return null if no variant is found
  } catch (error) {
    console.error("Error fetching variant details:", error);
    throw new Error("Failed to fetch variant details.");
  }
}

interface FormData {
  category_id: string;
  attributes: {
    [groupName: string]: {
      [attrName: string]: any;
    };
  };
}

interface CreateProductForm {
  category_id: string;
  attributes: Record<string, Record<string, any>>;
}

export async function createProduct(formData: CreateProductForm) {
  const { category_id, attributes } = formData;

  // 1) Validate
  if (!category_id || typeof category_id !== "string") {
    throw new Error("A valid category_id is required.");
  }
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  ) {
    throw new Error("Attributes object is required.");
  }

  // 2) Clean & collect groups
  const cleaned = Object.entries(attributes)
    .filter(([groupName]) => groupName !== "0")
    .map(([groupName, groupObj], idx) => {
      const cleanedAttrs = Object.entries(groupObj || {}).reduce<
        Record<string, any>
      >((acc, [key, val]) => {
        const isEmptyArray = Array.isArray(val) && val.length === 0;
        const isEmptyString = typeof val === "string" && !val.trim();
        const isNullish = val === null || val === undefined;
        if (isEmptyArray || isEmptyString || isNullish) {
          return acc;
        }
        acc[key] = val;
        return acc;
      }, {});

      if (!Object.keys(cleanedAttrs).length) return null;

      return { groupName, attrs: cleanedAttrs, order: idx };
    })
    .filter(<T>(v: T | null): v is T => v !== null);

  if (cleaned.length === 0) {
    throw new Error("No valid attribute groups after cleaning.");
  }

  // 3) Build a single attributes Map containing *all* groups
  const fullAttrs = new Map<string, any>();
  for (const { groupName, attrs, order } of cleaned) {
    // you can nest the group's own attrs inside the map under its name
    fullAttrs.set(groupName, {
      ...attrs,
      group_order: order,
    });
  }

  // 4) Save one Product document inside a transaction
  const session = await mongoose.startSession();
  try {
    await Product.collection.dropIndex("url_slug_1");
    console.log("Dropped index url_slug_1");
  } catch (e: any) {
    console.warn("Could not drop url_slug_1:", e.message);
  }

  try {
    await Product.collection.dropIndex("dsin_1");
    console.log("Dropped index dsin_1");
  } catch (e: any) {
    console.warn("Could not drop dsin_1:", e.message);
  }
  try {
    session.startTransaction();
    const catId = new mongoose.Types.ObjectId(category_id);

    const doc = new Product({
      category_id: catId,
      attributes: fullAttrs,
    });

    await doc.save({ session });

    await session.commitTransaction();
    revalidatePath("/admin/products/products_list");
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

interface UpdateProductForm {
  attributes: Record<string, Record<string, any>>;
}

export async function updateProduct(
  productId: string,
  formData: UpdateProductForm
) {
  const { attributes } = formData;

  console.log("attributes:", attributes);

  // 1) Validate inputs
  if (!productId || typeof productId !== "string") {
    throw new Error("A valid product ID is required.");
  }
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  ) {
    throw new Error("Attributes object is required.");
  }

  // 2) Clean incoming groups (just like before)
  const cleaned = Object.entries(attributes)
    .filter(([groupName]) => groupName !== "0")
    .map(([groupName, groupObj], idx) => {
      const cleanedAttrs = Object.entries(groupObj || {}).reduce<
        Record<string, any>
      >((acc, [key, val]) => {
        const isEmptyArray = Array.isArray(val) && val.length === 0;
        const isEmptyString = typeof val === "string" && !val.trim();
        const isNullish = val === null || val === undefined;
        if (isEmptyArray || isEmptyString || isNullish) {
          return acc;
        }
        acc[key] = val;
        return acc;
      }, {});

      if (Object.keys(cleanedAttrs).length === 0) {
        return null;
      }

      return { groupName, attrs: cleanedAttrs, order: idx };
    })
    .filter(<T>(v: T | null): v is T => v !== null);

  if (cleaned.length === 0) {
    throw new Error("No valid attribute groups after cleaning.");
  }

  // 3) Load your single Product doc
  const prodObjId = new mongoose.Types.ObjectId(productId);
  const doc = await Product.findById(prodObjId);
  if (!doc) {
    throw new Error(`Product with ID ${productId} not found.`);
  }

  // 4) Merge each cleaned group into existing `doc.attributes`
  //    leaving untouched groups/fields alone.
  for (const { groupName, attrs, order } of cleaned) {
    // get existing group (if any)
    const existingGroup = doc.attributes.get(groupName) || {};

    // merge only the incoming keys
    for (const [key, val] of Object.entries(attrs)) {
      existingGroup[key] = val;
    }

    // also update the group's order metadata
    existingGroup.group_order = order;

    // write back into the Map
    doc.attributes.set(groupName, existingGroup);
  }

  // 5) Save and return
  await doc.save();
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

export async function updateVariantAttributes(
  productId: string,
  variantData: {
    groupName: string;
    attributes: { name: string; value: string }[];
    imageUrls?: string[];
  }
) {
  await connection();
  try {
    const variant = await VariantAttribute.findOneAndUpdate(
      {
        product_id: new mongoose.Types.ObjectId(productId),
        groupName: variantData.groupName,
      },
      {
        $set: {
          attributes: variantData.attributes,
          ...(variantData.imageUrls && { imageUrls: variantData.imageUrls }),
        },
      },
      { upsert: true, new: true }
    );

    return variant;
  } catch (error) {
    console.error("Error updating variant attributes:", error);
    throw error;
  }
}

export async function deleteVariantImages(
  productId: string,
  groupName: string,
  imageUrls?: string[]
) {
  await connection();
  try {
    const variant = await VariantAttribute.findOne({
      product_id: new mongoose.Types.ObjectId(productId),
      groupName,
    });

    if (!variant) {
      throw new Error("Variant not found");
    }

    // Delete specific images or all images
    if (imageUrls?.length) {
      // Delete specific images from storage
      for (const url of imageUrls) {
        try {
          const imageRef = ref(storage, url);
          await deleteObject(imageRef);
        } catch (e) {
          console.error(`Error deleting image ${url}:`, e);
        }
      }

      // Remove URLs from variant
      interface VariantWithImages {
        imageUrls: string[];
      }

      variant.imageUrls = variant.imageUrls.filter(
        (url: string) => !imageUrls.includes(url)
      );
    } else {
      // Delete all images from storage
      for (const url of variant.imageUrls) {
        try {
          const imageRef = ref(storage, url);
          await deleteObject(imageRef);
        } catch (e) {
          console.error(`Error deleting image ${url}:`, e);
        }
      }

      variant.imageUrls = [];
    }

    await variant.save();
    return variant;
  } catch (error) {
    console.error("Error deleting variant images:", error);
    throw error;
  }
}
