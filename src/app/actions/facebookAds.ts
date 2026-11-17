"use server";


import { requireAdmin } from "@/lib/authz";
import { apiData, apiFetch } from "@/lib/server-api";
import type { FacebookAdsConnectionInput } from "@/lib/facebookAds";

export type { FacebookAdsConnectionInput } from "@/lib/facebookAds";

/* ============================ validation ============================ */

export async function validateFacebookAdsConnection(
  input: Partial<FacebookAdsConnectionInput>,
) {
  await requireAdmin();

  return apiFetch("/facebook-ads/settings/validate", {
    method: "POST",
    body: input,
  });
}

/* ========================== read / write ============================ */

/**
 * INTERNAL: returns the raw secret (used by sync / create helpers).
 * Never expose this to the browser directly — use loadFacebookAdsSettings().
 */
export async function getFacebookAdsSettings() {
  await requireAdmin();
  const settings = await apiData("/facebook-ads/settings", {
    query: { raw: true },
  });
  return settings ?? null;
}

/** UI-facing: returns the settings with sensitive values masked. */
export async function loadFacebookAdsSettings() {
  await requireAdmin();
  const settings = await apiData("/facebook-ads/settings/masked");
  return settings ?? null;
}

export async function saveFacebookAdsSettings(
  input: Partial<FacebookAdsConnectionInput>,
) {
  await requireAdmin();

  return apiFetch("/facebook-ads/settings", {
    method: "PUT",
    body: input,
  });
}

/* ============================ sync (Meta) =========================== */

export async function syncFacebookCampaigns() {
  await requireAdmin();

  return apiFetch("/facebook-ads/sync/campaigns", { method: "POST" });
}

export async function syncFacebookAdSets() {
  await requireAdmin();

  return apiFetch("/facebook-ads/sync/adsets", { method: "POST" });
}

export async function syncFacebookCatalogProducts(limit = 25) {
  await requireAdmin();

  return apiFetch("/facebook-ads/sync/catalog", {
    method: "POST",
    body: { limit },
  });
}

/* ============================ create (Meta) ========================= */

export async function createFacebookCampaign(input: {
  name: string;
  objective?: FacebookAdsConnectionInput["defaultObjective"];
  status?: "ACTIVE" | "PAUSED";
}) {
  await requireAdmin();

  return apiFetch("/facebook-ads/campaigns", {
    method: "POST",
    body: input,
  });
}

export async function createFacebookAdSet(input: {
  name: string;
  campaignId: string;
  status?: "ACTIVE" | "PAUSED";
  dailyBudget?: number;
  optimizationGoal?:
    | "LINK_CLICKS"
    | "OFFSITE_CONVERSIONS"
    | "REACH"
    | "POST_ENGAGEMENT"
    | "CONVERSIONS"
    | "THR";
  billingEvent?: "IMPRESSIONS" | "LINK_CLICKS";
  targeting?: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: {
      countries?: string[];
    };
  };
}) {
  await requireAdmin();

  return apiFetch("/facebook-ads/adsets", {
    method: "POST",
    body: input,
  });
}

export async function createFacebookAdCreative(input: {
  name: string;
  pageId?: string;
  headline?: string;
  body?: string;
  linkUrl: string;
  imageUrl?: string;
  callToAction?: "LEARN_MORE" | "SHOP_NOW" | "VISIT_SITE" | "ORDER_NOW";
}) {
  await requireAdmin();

  return apiFetch("/facebook-ads/creatives", {
    method: "POST",
    body: input,
  });
}

export async function createFacebookAd(input: {
  name: string;
  adSetId: string;
  creativeId: string;
  status?: "ACTIVE" | "PAUSED";
}) {
  await requireAdmin();

  return apiFetch("/facebook-ads/ads", {
    method: "POST",
    body: input,
  });
}

/* ============================== insights ============================ */

export async function getCampaignInsights(campaignId: string) {
  await requireAdmin();

  return apiFetch(
    `/facebook-ads/insights/campaigns/${encodeURIComponent(campaignId)}`,
  );
}

export async function getAdSetInsights(adSetId: string) {
  await requireAdmin();

  return apiFetch(`/facebook-ads/insights/adsets/${encodeURIComponent(adSetId)}`);
}
