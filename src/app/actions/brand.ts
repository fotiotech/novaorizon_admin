// app/actions/brand.ts
"use server";

import { requireAdmin } from "@/lib/authz";
import { apiData, apiFetch } from "@/lib/server-api";

/**
 * Brands live in the Express backend (`/api/brands`). This module is a thin,
 * authenticated proxy so the existing UI keeps its call signatures.
 */

// Fetch all brands, or a single brand when `brandId` is provided.
export async function getBrands(brandId?: string) {
  await requireAdmin();

  if (brandId) {
    const brand = await apiData<any>("/brands", { query: { id: brandId } });
    return brand ? { ...brand, _id: String(brand._id) } : undefined;
  }

  const brands = await apiData<any[]>("/brands");
  return (brands ?? []).map((brand) => ({
    ...brand,
    _id: String(brand._id),
  }));
}

export async function findProductsByBrand(brandId: string) {
  await requireAdmin();
  if (!brandId) return undefined;

  const products = await apiData<any[]>(
    `/brands/${encodeURIComponent(brandId)}/products`,
  );

  return (products ?? []).map((product) => ({
    ...product,
    _id: String(product._id),
    categoryId: product.categoryId ? String(product.categoryId) : product.categoryId,
    category_id: product.category_id ? String(product.category_id) : product.category_id,
    brand: product.brand ? String(product.brand) : product.brand,
  }));
}

// Create a new brand
export async function createBrand(data: {
  name: string;
  logoUrl?: string;
  status?: "active" | "inactive";
}) {
  await requireAdmin();
  if (!data) return;

  await apiFetch("/brands", {
    method: "POST",
    body: {
      name: data.name,
      logoUrl: data.logoUrl,
      status: data.status,
    },
  });
}

// Update an existing brand
export async function updateBrand(
  id: string,
  data: Partial<{
    name: string;
    logoUrl: string;
    status: "active" | "inactive";
  }>,
) {
  await requireAdmin();
  await apiFetch(`/brands/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data,
  });
}

// Delete a brand
export async function deleteBrand(id: string) {
  await requireAdmin();
  await apiFetch(`/brands/${encodeURIComponent(id)}`, { method: "DELETE" });
}
