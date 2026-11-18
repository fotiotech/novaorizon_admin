// lib/api/product.ts
import api from "@/lib/api";

/* ------------------------------ types ------------------------------ */

export type ProductStatus = "draft" | "active" | "inactive";

export interface ApiProductRef {
  _id: string;
  name: string;
}

export interface ApiProduct {
  _id: string;
  name: string;
  sku?: string;
  slug?: string;
  categoryId?: ApiProductRef | string | null;
  brand?: ApiProductRef | string | null;
  quantity?: number;
  lowStockThreshold?: number;
  listPrice?: number;
  price?: number;
  images?: string[];
  tags?: string[];
  status?: ProductStatus | string | { value?: string } | null;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

export interface ProductListResponse {
  products: ApiProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Populated when the request failed — mirrors the old server-action shape. */
  error?: string;
}

export interface ProductActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface CreateOrUpdateResult {
  success: boolean;
  data?: ApiProduct;
  error?: string;
}

function toMessage(err: any): string {
  const payload = err?.response?.data;
  if (payload?.errors) {
    const flat = Object.entries(payload.errors as Record<string, unknown>)
      .flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [],
      )
      .join("; ");
    if (flat) return flat;
  }
  return payload?.message || err?.message || "Request failed";
}

/* --------------------------- list + filter ------------------------ */

/**
 * GET /api/products — admin only, paginated.
 * Returns the shape the products list page already consumes.
 */
export async function findProducts(
  params: {
    q?: string;
    categoryId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
    sortDir?: "asc" | "desc";
  } = {},
): Promise<ProductListResponse> {
  try {
    const res = await api.get<{
      data: {
        products: ApiProduct[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    }>("/products", {
      params: {
        q: params.q || undefined,
        categoryId: params.categoryId || undefined,
        status: params.status || undefined,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        sort: params.sort ?? "createdAt",
        sortDir: params.sortDir ?? "desc",
      },
    });
    const d = res.data.data;
    return {
      products: d.products ?? [],
      total: d.total ?? 0,
      page: d.page ?? 1,
      pageSize: d.pageSize ?? 10,
      totalPages: d.totalPages ?? 1,
    };
  } catch (err) {
    return {
      products: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      error: toMessage(err),
    };
  }
}

/** GET /api/products/filter-categories — admin only */
export async function getProductFilterCategories(): Promise<
  Array<{ id: string; name: string }>
> {
  const res = await api.get<{ data: Array<{ id: string; name: string }> }>(
    "/products/filter-categories",
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/* ------------------------------- CRUD ----------------------------- */

/**
 * GET /api/products/:id — admin only.
 * Returns the product on success, or `{ error }` on failure. This mirrors the
 * shape the current ProductForm loader already branches on.
 */
export async function findProductById(
  id: string,
): Promise<ApiProduct | { error: string }> {
  try {
    const res = await api.get<{ data: ApiProduct }>(`/products/${id}`);
    return res.data.data;
  } catch (err) {
    return { error: toMessage(err) };
  }
}

/** POST /api/products — admin only. Normalizes to `{ success, data, error }`. */
export async function createProduct(
  payload: Record<string, any>,
): Promise<CreateOrUpdateResult> {
  try {
    const res = await api.post<{
      success: boolean;
      data: { product: ApiProduct; deletedSourceId?: string };
    }>("/products", payload);
    // Backend wraps the created product under `data.product`.
    return { success: true, data: res.data.data.product };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** PATCH /api/products/:id — admin only. */
export async function updateProduct(
  id: string,
  payload: Record<string, any>,
): Promise<CreateOrUpdateResult> {
  try {
    const res = await api.patch<{ success: boolean; data: ApiProduct }>(
      `/products/${id}`,
      payload,
    );
    return { success: true, data: res.data.data };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** DELETE /api/products/:id — admin only. */
export async function deleteProduct(id: string): Promise<ProductActionResult> {
  try {
    await api.delete(`/products/${id}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/* --------------------------- sub-resources ------------------------ */

/** POST /api/products/:id/recreate — admin only. */
export async function recreateProduct(
  id: string,
  draftKey: string,
): Promise<ProductActionResult> {
  try {
    await api.post(`/products/${id}/recreate`, { draftKey });
    return { success: true };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** PATCH /api/products/:id/category — admin only. */
export async function updateProductCategory(
  id: string,
  categoryId: string,
): Promise<ProductActionResult> {
  try {
    await api.patch(`/products/${id}/category`, { categoryId });
    return { success: true };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** PATCH /api/products/:id/status — admin only. */
export async function updateProductStatus(
  id: string,
  status: ProductStatus,
): Promise<ProductActionResult> {
  try {
    await api.patch(`/products/${id}/status`, { status });
    return { success: true };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** PATCH /api/products/:id/quantity — admin only. */
export async function updateProductQuantity(
  id: string,
  quantity: number,
): Promise<ProductActionResult> {
  try {
    await api.patch(`/products/${id}/quantity`, { quantity });
    return { success: true };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/** PATCH /api/products/:id/stock — admin only (quantity + lowStockThreshold). */
export async function updateProductStockLevel(
  id: string,
  quantity: number,
  lowStockThreshold: number,
): Promise<ProductActionResult> {
  try {
    const res = await api.patch<{ success: boolean; data: ApiProduct }>(
      `/products/${id}/stock`,
      { quantity, lowStockThreshold },
    );
    return { success: true, data: res.data.data };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

/**
 * DELETE /api/products/images?productId=&imageUrl= — admin only.
 * Removes the image from the product (when `productId` is given) and from
 * object storage; with only `imageUrl` it cleans up an orphaned upload.
 */
export async function deleteProductImages(
  productId?: string,
  imageUrl?: string,
): Promise<ProductActionResult> {
  try {
    const res = await api.delete<{ success: boolean; data: any }>(
      "/products/images",
      {
        params: {
          productId: productId || undefined,
          imageUrl: imageUrl || undefined,
        },
      },
    );
    return { success: true, data: res.data.data };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

export interface ProductPickerItem {
  _id: string;
  name: string;
  price: number;
  sku?: string;
  image?: string;
}

export interface ProductPickerResult {
  data: ProductPickerItem[];
  total: number;
  limit: number;
  skip: number;
}

/**
 * GET /api/products/picker — admin only. Lightweight paginated list used by
 * pickers (promotions, bundles, related products…).
 */
export async function listProducts(
  filter: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    isActive?: boolean;
  } = {},
  options: { limit?: number; skip?: number } = {},
): Promise<ProductPickerResult> {
  const limit = options.limit ?? 100;
  const skip = options.skip ?? 0;
  try {
    const res = await api.get<{ data: ProductPickerResult }>(
      "/products/picker",
      {
        params: {
          search: filter.search || undefined,
          categoryId: filter.categoryId || undefined,
          brandId: filter.brandId || undefined,
          isActive: filter.isActive,
          limit,
          skip,
        },
      },
    );
    return res.data?.data ?? { data: [], total: 0, limit, skip };
  } catch {
    return { data: [], total: 0, limit, skip };
  }
}
