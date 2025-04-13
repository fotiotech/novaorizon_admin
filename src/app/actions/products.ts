"use server";

import { Product as Prod } from "@/constant/types";
import Product from "@/models/Product";
import "@/models/Brand";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { Variant } from "@/models/Variant";
import { VariantAttribute } from "@/models/VariantAttributes";

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
    product_name,
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

  if (!product_name || !category_id) {
    throw new Error("Product name and category ID are required.");
  }

  const urlSlug = generateSlug(product_name, department);
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
    productName: product_name,
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
    imageUrls: imageUrls || [],
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const savedProduct = await newProduct.save();

  if (!savedProduct) throw new Error("Failed to save the product.");

  const flattenedAttributes = Object.entries(variantAttributes?.general!).map(
    ([name, values]) => ({
      name,
      values,
    })
  );

  const variantAttributesSaved = await Promise.all(
    flattenedAttributes.map(async (attribute) => {
      const variantAttribute = new VariantAttribute({
        product_id: savedProduct?._id.toString(),
        name: attribute.name,
        values: attribute.values,
      });

      return await variantAttribute.save();
    })
  );

  console.log(variants);

  const variantsSaved = await Promise.all(
    variants.map(async (variant: any) => {
      const newVariant = new Variant({
        product_id: savedProduct?._id.toString(), // Map relevant IDs
        url_slug: generateDsin(),
        dsin: generateDsin(),
        sku: generateDsin(),
        productName: variant?.productName,
        variantName: variant?.variantName,
        brand_id: variant?.brand_id ? variant?.brand_id.toString() : null,
        category_id: variant?.category_id?.toString(),
        department: variant.department,
        description: variant.description || "",
        basePrice: variant.basePrice,
        finalPrice: variant.finalPrice,
        taxRate: variant.taxRate || 0,
        discount: variant.discount || null,
        currency: variant.currency || "CFA",
        stockQuantity: variant.stockQuantity,
        attributes: variant.attributes || [],
        variantAttributes: variant.variantAttributes || [],
        imageUrls: variant.imageUrls || [],
        // VProductCode: generateDsin(),
        status: variant.status || "active",
      });

      return await newVariant.save();
    })
  );

  return { product: savedProduct, variantAttributesSaved, variantsSaved };
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
      product_name,
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
    const urlSlug = generateSlug(product_name, department);

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
          productName: product_name,
          category_id: category_id
            ? new mongoose.Types.ObjectId(category_id)
            : null,
          brand_id: brand_id ? new mongoose.Types.ObjectId(brand_id) : null,
          department,
          description,
          basePrice,
          finalPrice,
          attributes: cleanedAttributes.length > 0 ? cleanedAttributes : null,
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

    // Update variant attributes if provided
    if (variantAttributes) {
      const flattenedAttributes = Object.entries(
        variantAttributes?.general || {}
      ).map(([name, values]) => ({
        name,
        values,
      }));

      await Promise.all(
        flattenedAttributes.map(async (attribute) => {
          await VariantAttribute.findByIdAndUpdate(
            { product_id: id },
            {
              name: attribute.name,
              values: attribute.values,
            }
          );
        })
      );
    }

    // Update or create variants if provided
    if (variants?.length > 0) {
      await Promise.all(
        variants.map(async (variant: any) => {
          await Variant.findByIdAndUpdate(
            { product_id: id?.toString() },
            {
              $set: {
                ...variant,
                url_slug: variant.url_slug || generateDsin(),
                dsin: variant.dsin || generateDsin(),
                VProductCode: variant.VProductCode || generateDsin(),
                updated_at: new Date().toISOString(),
              },
            },
            { new: true, upsert: true }
          );
        })
      );
    }

    // Revalidate cache for updated product list
    revalidatePath("/admin/products/products_list");

    return updatedProduct;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error; // Rethrow the error so it can be handled by the caller
  }
}

export async function deleteProduct(id: string) {
  await connection();
  await Product.findByIdAndDelete(id);
}
