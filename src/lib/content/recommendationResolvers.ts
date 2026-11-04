// lib/content/recommendationResolvers.ts
import { getRecommendations, getRecentlyViewed } from "@/app/actions/events";
import type { RegistryKey } from "./entityMetadata";

export interface RecommendationContext {
  userId?: string;
}

export type RecommendationResolver = (
  kind: string,
  limit: number,
  ctx?: RecommendationContext,
) => Promise<any[]>;

/**
 * Per-user recommendation strategies. Global aggregates (trending,
 * bestsellers, featured, new) are materialized as fields on the entity
 * and expressed via rule collections — see `app/api/cron/product-metrics`.
 */
export const RECOMMENDATION_RESOLVERS: Partial<
  Record<RegistryKey, RecommendationResolver>
> = {
  Product: async (kind, limit, ctx) => {
    switch (kind) {
      case "personalized":
        return ctx?.userId ? getRecommendations(limit) : [];
      case "recentlyViewed":
        return ctx?.userId ? getRecentlyViewed(limit) : [];
      default:
        return [];
    }
  },
};

export function getRecommendationResolver(
  targetType: string | null | undefined,
): RecommendationResolver | undefined {
  if (!targetType) return undefined;
  return RECOMMENDATION_RESOLVERS[targetType as RegistryKey];
}
