// lib/api/events.ts
import api from "@/lib/api";

/**
 * Recommendation / trending / related-product reads live in the Express
 * backend (`/api/events`).
 */

/* --------------------------- recommendations ---------------------- */

/** GET /api/events/recommendations — authenticated user only. */
export async function getRecommendations(limit: number = 10): Promise<any[]> {
  const res = await api.get<{ data: any[] }>("/events/recommendations", {
    params: { limit },
  });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** GET /api/events/trending — public fallback when personalisation is empty. */
export async function getTrendingItems(limit: number = 10): Promise<any[]> {
  const res = await api.get<{ data: any[] }>("/events/trending", {
    params: { limit },
  });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** GET /api/events/recently-viewed — authenticated user only. */
export async function getRecentlyViewed(limit: number = 5): Promise<any[]> {
  const res = await api.get<{ data: any[] }>("/events/recently-viewed", {
    params: { limit },
  });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** GET /api/events/related/:productId — public. */
export async function getRelatedProducts(
  productId: string,
  limit: number = 10,
): Promise<any[]> {
  const res = await api.get<{ data: any[] }>(
    `/events/related/${encodeURIComponent(productId)}`,
    { params: { limit } },
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}
