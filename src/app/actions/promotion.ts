// app/actions/promotion.ts
"use server";
import { requireAdmin } from "@/lib/authz";
import { apiData, apiFetch } from "@/lib/server-api";
import { revalidatePath, updateTag } from "next/cache";

/**
 * Promotions live in the Express backend (`/api/promotions`). This module is a
 * thin, authenticated proxy so the existing UI keeps its call signatures.
 */

/**
 * Invalidate any content block that may render this promotion.
 *
 * Blocks resolve their promotion snapshot at request time (see
 * `lib/content/blocks/resolve.ts` — `resolvePromotionSource`). Editing
 * a promotion — including its banner `imageUrl` — must invalidate the
 * cached block payload so the storefront reflects the change on the
 * next request instead of waiting out `revalidate: 300` in
 * `unstable_cache`.
 *
 * We don't know which block locations reference this promotion, so we
 * drop the generic `blocks` tag. Every cached entry under
 * `getCachedBlocksForLocation(...)` is registered with it.
 */
function revalidatePromotionConsumers() {
  updateTag("blocks");
}

// ─────────────────────────────────────────────────────────────────────
// Options for the composer
// ─────────────────────────────────────────────────────────────────────
export interface PromotionOption {
  value: string;
  label: string;
  [key: string]: any;
}

export interface PromotionOptions {
  promotions: PromotionOption[];
  [key: string]: any;
}

export async function getPromotionOptions(): Promise<PromotionOptions> {
  await requireAdmin();

  return apiData<PromotionOptions>("/promotions/options");
}

// ─────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────
export async function createPromotion(data: any) {
  await requireAdmin();

  if (!data.calculationType) {
    throw new Error("Calculation type is required");
  }

  const promotion = await apiData("/promotions", {
    method: "POST",
    body: data,
  });

  revalidatePath("/marketing/promotions");
  revalidatePromotionConsumers();
  return promotion;
}

export async function updatePromotion(id: string, data: any) {
  await requireAdmin();

  const updated = await apiData(`/promotions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data,
  });

  revalidatePath("/marketing/promotions");
  revalidatePath(`/marketing/promotions/edit/${id}`);
  revalidatePromotionConsumers();
  return updated;
}

export async function deletePromotion(id: string) {
  await requireAdmin();

  await apiFetch(`/promotions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  revalidatePath("/marketing/promotions");
  // A deleted promotion makes any block that referenced it render
  // nothing — the resolve step returns [] for the missing document and
  // `getBlocksForLocation` filters empty sections out. Refresh the tag
  // so the storefront doesn't keep serving a stale banner.
  revalidatePromotionConsumers();
  return { success: true };
}

export async function getPromotion(id: string) {
  await requireAdmin();

  return apiData(`/promotions/${encodeURIComponent(id)}`);
}

export async function listPromotions(
  filter: any = {},
  options: { limit?: number; skip?: number; sort?: any } = {},
) {
  await requireAdmin();

  const { limit = 20, skip = 0 } = options;

  return apiData("/promotions", { query: { limit, skip } });
}

// ─────────────────────────────────────────────────────────────────────
// Product-side promotion scope
//
// The promotion owns scope.productIds; the product form is just a
// write-back UI for it. Only "products"-scoped promotions are exposed
// here — adding a product ID to an "all"/"categories"/"brands"
// promotion is a no-op in the resolver, so it shouldn't be selectable.
// ─────────────────────────────────────────────────────────────────────

/** Every product-scoped promotion, active or not — the admin may need
 *  to see and unselect one that was deactivated after being attached. */
export async function getSelectablePromotions() {
  await requireAdmin();

  return apiData("/promotions/selectable");
}

/** Product-scoped promotions that currently include this product.
 *  Deliberately does NOT filter on isActive so an inactive-but-attached
 *  promotion survives a product save untouched. */
export async function getProductPromotions(
  productId: string,
): Promise<string[]> {
  await requireAdmin();

  return apiData<string[]>(
    `/promotions/by-product/${encodeURIComponent(productId)}`,
  );
}

/** Reconcile scope.productIds for product-scoped promotions against the
 *  form's selection. Other scopes are untouched. */
export async function syncProductPromotions(
  productId: string,
  promotionIds: string[],
): Promise<{ success: true }> {
  await requireAdmin();

  await apiFetch(
    `/promotions/by-product/${encodeURIComponent(productId)}/sync`,
    {
      method: "POST",
      body: { promotionIds },
    },
  );

  revalidatePath("/marketing/promotions");
  // Scope changes affect which products appear in a promotion-sourced
  // block (e.g. `display: "banner"` with `promotionMode: "products"`),
  // so drop the block cache too.
  revalidatePromotionConsumers();
  return { success: true };
}
