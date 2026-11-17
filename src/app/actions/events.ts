"use server";

import { requireAdmin } from "@/lib/authz";
import { apiData } from "@/lib/server-api";

/**
 * Recommendation / trending / related-product reads live in the Express
 * backend (`/api/events`). These actions are thin, authenticated proxies so
 * the existing UI keeps its call signatures.
 */

// ─── 2. Get personalized recommendations ──────────────

export async function getRecommendations(limit: number = 10) {
  await requireAdmin();

  return apiData("/events/recommendations", { query: { limit } });
}

// ─── 3. Trending (fallback) ────────────────────────────

export async function getTrendingItems(limit: number = 10) {
  await requireAdmin();

  return apiData("/events/trending", { query: { limit } });
}

// ─── 4. Recently viewed ─────────────────────────────────

export async function getRecentlyViewed(limit: number = 5) {
  await requireAdmin();

  return apiData("/events/recently-viewed", { query: { limit } });
}

export async function getRelatedProducts(
  productId: string,
  limit: number = 10,
) {
  await requireAdmin();

  return apiData(
    `/events/related/${encodeURIComponent(productId)}`,
    { query: { limit } },
  );
}
