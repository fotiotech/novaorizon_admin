"use server";

import Product from "@/models/Product";
import "@/models/Brand";
import { connection } from "@/utils/connection";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { Variant } from "@/models/Variant";
import { VariantAttribute } from "@/models/VariantAttributes";
import { ref, deleteObject } from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";
import mongoose from "mongoose";

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
      .populate("brand_id")
      .exec();

    return products.map((prod) => ({
      ...prod.toObject(),
      _id: prod._id.toString(),
      category_id: prod.category_id?.toString() ?? null,
      brand_id: prod.brand_id?._id
        ? {
            _id: prod.brand_id._id.toString(),
            name: prod.brand_id.name,
          }
        : null,
      attributes: prod.attributes?.map((attr: any) => ({
        ...attr.toObject(),
        _id: attr._id?.toString(),
      })),
    }));
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

export async function createProduct(formData: any) {
  const {
    category_id,
    attributes,
    variants,
    variantAttributes,
    imageUrls,
    sku,
    productName,
    brand_id,
    department,
    description,
    basePrice,
    finalPrice,
    taxRate,
    discount,
    currency,
    productCode,
    stockQuantity,
    status,
  } = formData;

  if (!productName || !category_id) {
    throw new Error("Product name and category ID are required.");
  }

  const urlSlug = generateSlug(productName, department);
  const dsin = generateDsin();

  const cleanedAttributes = Object.entries(attributes || {})
    .filter(([groupName]) => groupName !== "0")
    .map(([groupName, group]) => ({
      groupName,
      attributes: Object.fromEntries(
        Object.entries(group as any).filter(([key]) => key !== "undefined")
      ),
    }));

  await connection();

  const newProduct = new Product({
    url_slug: urlSlug,
    dsin,
    sku,
    productName,
    category_id: category_id.toString(),
    brand_id: brand_id
      ? typeof brand_id === "string"
        ? brand_id.toString()
        : brand_id?._id.toString()
      : null,
    department,
    description,
    basePrice,
    finalPrice,
    taxRate,
    discount,
    currency,
    // productCode,
    stockQuantity,
    attributes: cleanedAttributes.length > 0 ? cleanedAttributes : null,
    variantAttributes,
    variants,
    imageUrls: imageUrls || [],
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const savedProduct = await newProduct.save();

  if (!savedProduct) throw new Error("Failed to save the product.");

  return "Ok!";
}

export async function updateProduct(id: string, formData: any) {
  try {
    if (!id || !formData) throw new Error("Invalid product ID or formData");

    const {
      category_id,
      attributes,
      variants,
      variantAttributes,
      imageUrls,
      sku,
      productName,
      brand_id,
      department,
      description,
      basePrice,
      finalPrice,
      taxRate,
      discount,
      currency,
      productCode,
      stockQuantity,
      status,
    } = formData;

    // Connect to the database
    await connection();

    // Generate a slug for the product based on updated information
    const urlSlug = generateSlug(productName, department);

    // Clean up the attributes
    const cleanedAttributes = Object.entries(attributes || {})
      .filter(([groupName]) => groupName !== "0")
      .map(([groupName, group]) => ({
        groupName,
        attributes: Object.fromEntries(
          Object.entries(group || {}).filter(([key]) => key !== "undefined")
        ),
      }));

    // Update the product in the database
    const updatedProduct = await Product.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          url_slug: urlSlug || "",
          sku,
          productName,
          category_id: category_id ? category_id.toString() : null,
          brand_id: brand_id ? brand_id.toString() : null,
          department,
          description,
          basePrice,
          finalPrice,
          attributes: cleanedAttributes.length > 0 ? cleanedAttributes : null,
          variantAttributes,
          variants,
          imageUrls: imageUrls || [],
          taxRate,
          discount,
          currency,
          stockQuantity,
          status,
          updated_at: new Date().toISOString(),
        },
      },
      { new: true }
    );

    if (!updatedProduct) throw new Error("Product not found");

    // Revalidate cache for updated product list
    revalidatePath("/admin/products/products_list");

    return "Ok!";
  } catch (error) {
    console.error("Error updating product:", error);
    throw error; // Rethrow the error so it can be handled by the caller
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

/**
 * Deletes one or all image URLs of a product.
 * @param productId - The ID of the product.
 * @param imageUrl - The specific image URL to delete (optional). If not provided, all images will be deleted.
 */

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
