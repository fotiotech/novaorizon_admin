// lib/api/promotion.ts
import api from "@/lib/api";

/**
 * Entity shape returned by GET /promotions/selectable.
 *
 * Structurally compatible with the `EntityOption` type used by
 * `EntityPicker` in the product form — the extra fields (`sublabel`,
 * `badge`, `inactive`) are optional in the picker, so assigning an
 * `EntityOption[]` state from this result is type-safe without a cast.
 */
export interface PromotionOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  inactive?: boolean;
}

/**
 * GET /api/promotions/selectable — admin only.
 * Returns product-scoped promotions that can be attached to a product
 * (i.e. `scope.appliesTo === "products"`). Throws on failure — the caller
 * (`ProductForm`) wraps this in try/catch to handle load errors gracefully.
 */
export async function getSelectablePromotions(): Promise<PromotionOption[]> {
  const res = await api.get<{ data: PromotionOption[] }>(
    "/promotions/selectable",
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/**
 * GET /api/promotions/by-product/:productId — admin only.
 * Returns the IDs of product-scoped promotions that already include this
 * product. Used to seed the picker in edit mode. Throws on failure.
 */
export async function getProductPromotions(
  productId: string,
): Promise<string[]> {
  const res = await api.get<{ data: string[] }>(
    `/promotions/by-product/${encodeURIComponent(productId)}`,
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/**
 * POST /api/promotions/by-product/:productId/sync — admin only.
 * Reconciles the product-scoped promotion set:
 *   - promotions in `validIds` get the product added to their scope,
 *   - product-scoped promotions NOT in the set get it removed.
 * Promotions that apply to all products are handled server-side and are
 * never touched by this call.
 *
 * Throws on failure — `ProductForm` catches the error and shows a
 * "product saved but promotion updates failed" toast so the user knows
 * the save itself succeeded.
 */
export async function syncProductPromotions(
  productId: string,
  promotionIds: string[],
): Promise<void> {
  await api.post(
    `/promotions/by-product/${encodeURIComponent(productId)}/sync`,
    { promotionIds },
  );
}


/* ------------------------------------------------------------------ */
/*                   Composer options + CRUD (admin)                   */
/* ------------------------------------------------------------------ */

/** A product option as returned by GET /promotions/options. */
export interface PromotionProductOption {
  value: string;
  label: string;
  sku?: string;
  price?: number;
  image?: string;
}

/** A category / brand option as returned by GET /promotions/options. */
export interface PromotionEntityOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface PromotionOptions {
  customerGroups: { label: string; value: string }[];
  promotions: PromotionOption[];
  products: PromotionProductOption[];
  categories: PromotionEntityOption[];
  brands: PromotionEntityOption[];
  offers: { value: string; label: string; sublabel?: string }[];
  collections: { value: string; label: string }[];
}

export interface PromotionListResult {
  data: any[];
  total: number;
  limit: number;
  skip: number;
}

/**
 * GET /api/promotions/options — admin only.
 * Everything the promotion composer needs for its pickers.
 */
export async function getPromotionOptions(): Promise<PromotionOptions> {
  const res = await api.get<{ data: PromotionOptions }>("/promotions/options");
  const d = res.data?.data;
  return {
    customerGroups: Array.isArray(d?.customerGroups) ? d.customerGroups : [],
    promotions: Array.isArray(d?.promotions) ? d.promotions : [],
    products: Array.isArray(d?.products) ? d.products : [],
    categories: Array.isArray(d?.categories) ? d.categories : [],
    brands: Array.isArray(d?.brands) ? d.brands : [],
    offers: Array.isArray(d?.offers) ? d.offers : [],
    collections: Array.isArray(d?.collections) ? d.collections : [],
  };
}

/** GET /api/promotions — admin only, paginated. */
export async function listPromotions(
  filter: any = {},
  options: { limit?: number; skip?: number; sort?: any } = {},
): Promise<PromotionListResult> {
  const { limit = 20, skip = 0 } = options;
  const res = await api.get<{ data: PromotionListResult }>("/promotions", {
    params: { limit, skip },
  });
  const d = res.data?.data;
  return {
    data: Array.isArray(d?.data) ? d.data : [],
    total: d?.total ?? 0,
    limit: d?.limit ?? limit,
    skip: d?.skip ?? skip,
  };
}

/** GET /api/promotions/:id — admin only. */
export async function getPromotion(id: string): Promise<any> {
  const res = await api.get<{ data: any }>(
    `/promotions/${encodeURIComponent(id)}`,
  );
  return res.data.data;
}

/** POST /api/promotions — admin only. */
export async function createPromotion(data: any): Promise<any> {
  if (!data?.calculationType) {
    throw new Error("Calculation type is required");
  }
  const res = await api.post<{ success: boolean; data: any }>(
    "/promotions",
    data,
  );
  return res.data.data;
}

/** PATCH /api/promotions/:id — admin only. */
export async function updatePromotion(id: string, data: any): Promise<any> {
  const res = await api.patch<{ success: boolean; data: any }>(
    `/promotions/${encodeURIComponent(id)}`,
    data,
  );
  return res.data.data;
}

/** DELETE /api/promotions/:id — admin only. */
export async function deletePromotion(
  id: string,
): Promise<{ success: boolean }> {
  const res = await api.delete<{ success: boolean }>(
    `/promotions/${encodeURIComponent(id)}`,
  );
  return res.data ?? { success: true };
}

export interface PromotionRulePreview {
  count: number;
  truncated: boolean;
  sample: { _id: string; name: string; price?: number; image?: string }[];
}

export async function previewPromotionRules(input: {
  rules: { field: string; operator: string; value?: any }[];
  match?: "all" | "any";
  offerId?: string;
}): Promise<PromotionRulePreview> {
  const res = await api.post<{ data: PromotionRulePreview }>(
    "/promotions/preview",
    input,
  );
  return res.data.data;
}