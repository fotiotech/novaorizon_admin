// app/actions/analytic.ts
"use server";
import { requireAdmin } from "@/lib/authz";
import { apiData } from "@/lib/server-api";
import type { UserAnalytics } from "@/constant/types/user";
import type { ProductAnalytics } from "@/constant/types/product";

/**
 * Analytics aggregation lives in the Express backend (`/api/analytics`). These
 * actions are thin, authenticated proxies so the existing UI keeps its call
 * signatures.
 */

export async function getUserAnalytics(): Promise<UserAnalytics> {
  await requireAdmin();

  return apiData<UserAnalytics>("/analytics/users");
}

export async function getOrderAnalytics() {
  await requireAdmin();

  return apiData("/analytics/orders");
}

export async function getProductAnalytics(): Promise<ProductAnalytics> {
  await requireAdmin();

  return apiData<ProductAnalytics>("/analytics/products");
}

export async function getFacebookAdsAnalytics() {
  await requireAdmin();

  try {
    return await apiData("/analytics/facebook-ads");
  } catch (error) {
    console.error("Facebook Ads analytics error:", error);
    return {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      avgCPC: 0,
      totalConversions: 0,
      roi: 0,
      campaignCount: 0,
      isConfigured: false,
    };
  }
}

export async function getOverviewData() {
  // await requireAdmin();
  return apiData("/analytics/overview");
}
