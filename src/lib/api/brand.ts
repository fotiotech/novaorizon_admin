// lib/api/brand.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";

/* ------------------------------ types ------------------------------ */

export interface ApiBrand {
  _id: string;
  name: string;
  logoUrl?: string;
  status?: "active" | "inactive";
  [k: string]: any;
}

export interface BrandInput {
  name: string;
  logoUrl?: string;
  status?: "active" | "inactive";
}

export interface ApiBrandProduct {
  _id: string;
  categoryId?: string;
  category_id?: string;
  brand?: string;
  [k: string]: any;
}

function normalizeBrand(brand: any): ApiBrand {
  return { ...brand, _id: String(brand?._id) };
}

/* ------------------------------ reads ------------------------------ */

/** GET /api/brands — admin only. Returns every brand. */
export function getBrands(): Promise<ApiBrand[]>;
/** GET /api/brands?id= — admin only. Returns a single brand (undefined on 404). */
export function getBrands(brandId: string): Promise<ApiBrand | undefined>;
export async function getBrands(
  brandId?: string,
): Promise<ApiBrand[] | ApiBrand | undefined> {
  if (brandId) {
    try {
      const res = await api.get<{ data: any }>("/brands", {
        params: { id: brandId },
      });
      const brand = res.data?.data;
      return brand ? normalizeBrand(brand) : undefined;
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) return undefined;
      throw err;
    }
  }

  const res = await api.get<{ data: any[] }>("/brands");
  const brands = Array.isArray(res.data?.data) ? res.data.data : [];
  return brands.map(normalizeBrand);
}

/** GET /api/brands/:brandId/products — admin only. */
export async function findProductsByBrand(
  brandId: string,
): Promise<ApiBrandProduct[] | undefined> {
  if (!brandId) return undefined;

  const res = await api.get<{ data: any[] }>(
    `/brands/${encodeURIComponent(brandId)}/products`,
  );
  const products = Array.isArray(res.data?.data) ? res.data.data : [];

  return products.map((product) => ({
    ...product,
    _id: String(product._id),
    categoryId: product.categoryId
      ? String(product.categoryId)
      : product.categoryId,
    category_id: product.category_id
      ? String(product.category_id)
      : product.category_id,
    brand: product.brand ? String(product.brand) : product.brand,
  }));
}

/* ---------------------------- mutations ---------------------------- */

/** POST /api/brands — admin only. */
export async function createBrand(data: BrandInput): Promise<ApiBrand | null> {
  if (!data) return null;
  const res = await api.post<{ data: ApiBrand }>("/brands", {
    name: data.name,
    logoUrl: data.logoUrl,
    status: data.status,
  });
  return res.data?.data ?? null;
}

/** PATCH /api/brands/:id — admin only. */
export async function updateBrand(
  id: string,
  data: Partial<BrandInput>,
): Promise<void> {
  await api.patch(`/brands/${encodeURIComponent(id)}`, data);
}

/** DELETE /api/brands/:id — admin only. */
export async function deleteBrand(id: string): Promise<void> {
  await api.delete(`/brands/${encodeURIComponent(id)}`);
}