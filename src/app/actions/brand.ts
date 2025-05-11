// app/actions/brand.ts
"use server";

import Brand from "@/models/Brand";
import Product from "@/models/Product";
import { connection } from "@/utils/connection";
import slugify from "slugify";

// Fetch all brands
export async function getBrands(brandId?: string) {
  try {
    await connection();

    if (brandId) {
      const brand = await Brand.findOne({ _id: brandId });
      return {
        ...brand?.toObject(),
        _id: brand?._id?.toString(),
      };
    }

    const brands = await Brand.find().sort({ created_at: -1 });

    console.log("brands:", brands);
    return brands.map((brand) => ({
      ...brand?.toObject(),
      _id: brand?._id?.toString(),
    }));
  } catch (error) {
    console.error("Error fetching brands:", error);
    throw error;
  }
}

export async function findProductsByBrand(brandId: string) {
  await connection();

  if (brandId) {
    const products = await Product.find({ brand_id: brandId });
    if (products) {
      return products.map((product) => ({
        ...product.toObject(),
        _id: product._id?.toString(),
        category_id: product.category_id?.toString(),
        brand_id: product.brand_id?.toString(),
        attributes: product.attributes?.map((attr: any) => ({
          ...attr.toObject(),
          _id: attr._id?.toString(),
        })),
      }));
    }
  }
}

// Create a new brand

function generateSlug(name: string, logoUrl: string) {
  return slugify(`${name}${logoUrl ? `-${logoUrl}` : ""}`, {
    lower: true,
  });
}

export async function createBrand(data: {
  name: string;
  logoUrl?: string;
  status?: "active" | "inactive";
}) {
  await connection();

  // Exclude `_id` from the data to let MongoDB generate it automatically
  if (data) {
    const { name, logoUrl, status } = data;
    const url_slug = generateSlug(name, logoUrl as string);

    const newBrand = new Brand({ url_slug, name, logoUrl, status });

    await newBrand.save();
  }
}

// Update an existing brand
export async function updateBrand(
  id: string,
  data: Partial<{
    name: string;
    logoUrl: string;
    status: "active" | "inactive";
  }>
) {
  await connection();
  await Brand.findByIdAndUpdate(id, data, { new: true });
}

// Delete a brand
export async function deleteBrand(id: string) {
  await connection();
  await Brand.findByIdAndDelete(id);
}
