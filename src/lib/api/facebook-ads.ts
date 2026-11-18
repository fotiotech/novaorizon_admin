// lib/api/facebook-ads.ts
import api from "@/lib/api";
import type { FacebookAdsConnectionInput } from "@/lib/facebookAds";

export type { FacebookAdsConnectionInput } from "@/lib/facebookAds";

/**
 * Facebook (Meta) Ads integration lives in the Express backend
 * (`/api/facebook-ads`). Client-side replacement for the old
 * `app/actions/facebookAds.ts` server actions.
 */

export interface FacebookAdsValidationResult {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
}

/**
 * Masked settings — secrets come back as `SECRET_MASK`.
 *
 * Intersected with `Record<string, any>` on purpose: the settings form merges
 * this straight into its own state, and the backend fields are optional in the
 * schema but required in the form, so the merge must not narrow the form type.
 */
export type FacebookAdsSettings = (Partial<FacebookAdsConnectionInput> &
  Record<string, any> & { updatedAt?: string }) | null;

export interface FacebookAdsSaveResult {
  ok: boolean;
  data?: Partial<FacebookAdsConnectionInput> & Record<string, any>;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface FacebookCampaignRow {
  id?: string;
  name?: string;
  status?: string;
  objective?: string;
  configured_status?: string;
  created_time?: string;
}

export interface FacebookAdSetRow {
  id?: string;
  name?: string;
  campaign_id?: string;
  status?: string;
  created_time?: string;
}

export interface FacebookInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
}

export interface FacebookCampaignsResult {
  ok: boolean;
  message?: string;
  campaigns?: FacebookCampaignRow[];
}

export interface FacebookAdSetsResult {
  ok: boolean;
  message?: string;
  adSets?: FacebookAdSetRow[];
}

export interface FacebookCatalogSyncResult {
  ok: boolean;
  message?: string;
  synced?: number;
  errors?: string[];
}

export interface FacebookCampaignCreateResult {
  ok: boolean;
  message?: string;
  campaign?: any;
}

export interface FacebookAdSetCreateResult {
  ok: boolean;
  message?: string;
  adSet?: any;
}

export interface FacebookCreativeCreateResult {
  ok: boolean;
  message?: string;
  creative?: any;
}

export interface FacebookAdCreateResult {
  ok: boolean;
  message?: string;
  ad?: any;
}

export interface FacebookInsightsResult {
  ok: boolean;
  message?: string;
  insights?: FacebookInsights | null;
}

/* ============================ validation ============================ */

/** POST /api/facebook-ads/settings/validate — admin only. */
export async function validateFacebookAdsConnection(
  input: Partial<FacebookAdsConnectionInput>,
): Promise<FacebookAdsValidationResult> {
  const res = await api.post<FacebookAdsValidationResult>(
    "/facebook-ads/settings/validate",
    input,
  );
  return res.data;
}

/* ========================== read / write ============================ */

/**
 * GET /api/facebook-ads/settings?raw=true — admin only.
 * INTERNAL: returns the raw secret (used by sync / create helpers).
 * Never expose this to the browser directly — use loadFacebookAdsSettings().
 */
export async function getFacebookAdsSettings(): Promise<FacebookAdsSettings> {
  const res = await api.get<{ data: FacebookAdsSettings }>(
    "/facebook-ads/settings",
    { params: { raw: true } },
  );
  return res.data?.data ?? null;
}

/** GET /api/facebook-ads/settings/masked — admin only, UI-facing. */
export async function loadFacebookAdsSettings(): Promise<FacebookAdsSettings> {
  const res = await api.get<{ data: FacebookAdsSettings }>(
    "/facebook-ads/settings/masked",
  );
  return res.data?.data ?? null;
}

/** PUT /api/facebook-ads/settings — admin only. */
export async function saveFacebookAdsSettings(
  input: Partial<FacebookAdsConnectionInput>,
): Promise<FacebookAdsSaveResult> {
  const res = await api.put<FacebookAdsSaveResult>(
    "/facebook-ads/settings",
    input,
  );
  return res.data;
}

/* ============================ sync (Meta) =========================== */

/** POST /api/facebook-ads/sync/campaigns — admin only. */
export async function syncFacebookCampaigns(): Promise<FacebookCampaignsResult> {
  const res = await api.post<FacebookCampaignsResult>(
    "/facebook-ads/sync/campaigns",
  );
  return res.data;
}

/** POST /api/facebook-ads/sync/adsets — admin only. */
export async function syncFacebookAdSets(): Promise<FacebookAdSetsResult> {
  const res = await api.post<FacebookAdSetsResult>("/facebook-ads/sync/adsets");
  return res.data;
}

/** POST /api/facebook-ads/sync/catalog — admin only. */
export async function syncFacebookCatalogProducts(
  limit = 25,
): Promise<FacebookCatalogSyncResult> {
  const res = await api.post<FacebookCatalogSyncResult>(
    "/facebook-ads/sync/catalog",
    { limit },
  );
  return res.data;
}

/* ============================ create (Meta) ========================= */

/** POST /api/facebook-ads/campaigns — admin only. */
export async function createFacebookCampaign(input: {
  name: string;
  objective?: FacebookAdsConnectionInput["defaultObjective"];
  status?: "ACTIVE" | "PAUSED";
}): Promise<FacebookCampaignCreateResult> {
  const res = await api.post<FacebookCampaignCreateResult>(
    "/facebook-ads/campaigns",
    input,
  );
  return res.data;
}

/** POST /api/facebook-ads/adsets — admin only. */
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
}): Promise<FacebookAdSetCreateResult> {
  const res = await api.post<FacebookAdSetCreateResult>(
    "/facebook-ads/adsets",
    input,
  );
  return res.data;
}

/** POST /api/facebook-ads/creatives — admin only. */
export async function createFacebookAdCreative(input: {
  name: string;
  pageId?: string;
  headline?: string;
  body?: string;
  linkUrl: string;
  imageUrl?: string;
  callToAction?: "LEARN_MORE" | "SHOP_NOW" | "VISIT_SITE" | "ORDER_NOW";
}): Promise<FacebookCreativeCreateResult> {
  const res = await api.post<FacebookCreativeCreateResult>(
    "/facebook-ads/creatives",
    input,
  );
  return res.data;
}

/** POST /api/facebook-ads/ads — admin only. */
export async function createFacebookAd(input: {
  name: string;
  adSetId: string;
  creativeId: string;
  status?: "ACTIVE" | "PAUSED";
}): Promise<FacebookAdCreateResult> {
  const res = await api.post<FacebookAdCreateResult>("/facebook-ads/ads", input);
  return res.data;
}

/* ============================== insights ============================ */

/** GET /api/facebook-ads/insights/campaigns/:campaignId — admin only. */
export async function getCampaignInsights(
  campaignId: string,
): Promise<FacebookInsightsResult> {
  const res = await api.get<FacebookInsightsResult>(
    `/facebook-ads/insights/campaigns/${encodeURIComponent(campaignId)}`,
  );
  return res.data;
}

/** GET /api/facebook-ads/insights/adsets/:adSetId — admin only. */
export async function getAdSetInsights(
  adSetId: string,
): Promise<FacebookInsightsResult> {
  const res = await api.get<FacebookInsightsResult>(
    `/facebook-ads/insights/adsets/${encodeURIComponent(adSetId)}`,
  );
  return res.data;
}
