"use server";

import { Brand, Category } from "@/constant/types";
import Product from "@/models/Product";
import { connection } from "@/utils/connection";

export async function getSearch(
  query: string,
  category?: string,
  brand?: string,
  priceMin?: string,
  priceMax?: string
) {
  await connection();
  try {
    if (!query) return { products: [], filters: {} };

    const filters = await generateFilters(
      query,
      category,
      brand,
      priceMin,
      priceMax
    );

    const products = await Product.find({
      productName: { $regex: query, $options: "i" },
      ...(category && { category_id: category }),
      ...(brand && { brand_id: brand }),
      ...(priceMin &&
        priceMax && { price: { $gte: +priceMin, $lte: +priceMax } }),
    });

    return {
      products: products.map((prod:any) => ({
        ...prod.toObject(),
        _id: prod._id.toString(),
        category_id: prod.category_id?.toString(),
        brand_id: prod.brand_id?.toString(),
      })),
      filters,
    };
  } catch (error) {
    console.error(error);
    return { products: [], filters: {} };
  }
}

async function generateFilters(
  query: string,
  category?: string,
  brand?: string,
  priceMin?: string,
  priceMax?: string
) {
  try {
    const aggregation = await Product.aggregate([
      { $match: { productName: { $regex: query, $options: "i" } } },
      {
        $facet: {
          categories: [
            { $group: { _id: "$category_id", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "categories", // Ensure this matches your collection name
                localField: "_id", // Match the category_id with the _id from categories collection
                foreignField: "_id",
                as: "details",
              },
            },
            { $unwind: "$details" },
            {
              $project: {
                id: "$_id",
                name: "$details.categoryName", // Ensure this field exists in categories collection
                count: 1,
              },
            },
          ],
          brands: [
            { $group: { _id: "$brand_id", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "brands",
                localField: "_id",
                foreignField: "_id",
                as: "details",
              },
            },
            { $unwind: "$details" },
            { $project: { id: "$_id", name: "$details.name", count: 1 } },
          ],
          priceRange: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
              },
            },
          ],
        },
      },
    ]);

    const filters = aggregation[0];

    return {
      categories: filters.categories.map((cat: any) => ({
        id: cat._id?.toString(),
        name: cat.name, // Ensure 'name' is correctly set from category's categoryName
        count: cat.count,
      })),
      brands: filters.brands.map((brand: any) => ({
        id: brand._id?.toString(),
        name: brand.name,
        count: brand.count,
      })),
      priceRange: {
        min: filters.priceRange[0]?.minPrice ?? 0,
        max: filters.priceRange[0]?.maxPrice ?? 0,
      },
    };
  } catch (error) {
    console.error(error);
    return { categories: [], brands: [], priceRange: { min: 0, max: 0 } };
  }
}
