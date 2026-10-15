"use server";

import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import {
  FacebookAdsConnectionInput,
  FacebookAdsConnectionSchema,
  SECRET_MASK,
  SENSITIVE_FIELDS,
  maskSecrets,
} from "@/lib/facebookAds";
import {
  getSecret,
  putSecret,
  invalidateSecretCache,
} from "@/lib/aws/awsSecrets";

export type { FacebookAdsConnectionInput } from "@/lib/facebookAds";

/* ============================ validation ============================ */

export async function validateFacebookAdsConnection(
  input: Partial<FacebookAdsConnectionInput>,
) {
  const parsed = FacebookAdsConnectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Please complete the required Facebook Ads connection fields.",
    };
  }

  return {
    ok: true,
    message:
      "Connection settings look valid. They will be stored securely in AWS Secrets Manager.",
  };
}

/* ========================== read / write ============================ */

/**
 * INTERNAL: returns the raw secret (used by sync / create helpers).
 * Never expose this to the browser directly — use loadFacebookAdsSettings().
 */
export async function getFacebookAdsSettings() {
  const settings = await getSecret();
  return settings ?? null;
}

/** UI-facing: returns the settings with sensitive values masked. */
export async function loadFacebookAdsSettings() {
  const settings = await getSecret();
  if (!settings) return null;
  return maskSecrets(settings);
}

export async function saveFacebookAdsSettings(
  input: Partial<FacebookAdsConnectionInput>,
) {
  const existing = (await getSecret()) ?? {};

  // Strip masked sentinels + empty sensitive values so we don't
  // overwrite already-stored secrets with blanks.
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === SECRET_MASK) continue;
    if (
      (SENSITIVE_FIELDS as readonly string[]).includes(key) &&
      (value === "" || value === undefined) &&
      existing[key]
    ) {
      continue;
    }
    cleaned[key] = value;
  }

  const merged = {
    ...existing,
    ...cleaned,
    updatedAt: new Date().toISOString(),
  };

  const validated = FacebookAdsConnectionSchema.safeParse(merged);

  if (!validated.success) {
    return {
      ok: false,
      message: "Invalid Facebook Ads connection data.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  await putSecret(validated.data as Record<string, unknown>);
  invalidateSecretCache();

  return {
    ok: true,
    data: maskSecrets(validated.data),
    message: "Facebook Ads settings saved to AWS Secrets Manager.",
  };
}

/* ============================ sync (Meta) =========================== */

export async function syncFacebookCampaigns() {
  const settings = await getFacebookAdsSettings();

  if (!settings) {
    return {
      ok: false,
      message: "No Facebook Ads connection is configured yet.",
      campaigns: [],
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/${settings.apiVersion || "v20.0"}/${settings.adAccountId}/campaigns?fields=id,name,status,objective,configured_status,created_time&access_token=${encodeURIComponent(settings.accessToken as string)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      message: `Facebook API error: ${errorText}`,
      campaigns: [],
    };
  }

  const payload = await response.json();
  const campaigns = Array.isArray(payload.data) ? payload.data : [];

  return {
    ok: true,
    message: `Fetched ${campaigns.length} campaign(s) from Meta.`,
    campaigns,
  };
}

export async function syncFacebookAdSets() {
  const settings = await getFacebookAdsSettings();

  if (!settings) {
    return {
      ok: false,
      message: "No Facebook Ads connection is configured yet.",
      adSets: [],
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/${settings.apiVersion || "v20.0"}/${settings.adAccountId}/adsets?fields=id,name,campaign_id,status,created_time&access_token=${encodeURIComponent(settings.accessToken as string)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      message: `Facebook API error: ${errorText}`,
      adSets: [],
    };
  }

  const payload = await response.json();
  const adSets = Array.isArray(payload.data) ? payload.data : [];

  return {
    ok: true,
    message: `Fetched ${adSets.length} ad set(s) from Meta.`,
    adSets,
  };
}

export async function syncFacebookCatalogProducts(limit = 25) {
  const settings = await getFacebookAdsSettings();

  if (!settings) {
    return {
      ok: false,
      message: "No Facebook Ads connection is configured yet.",
      synced: 0,
    };
  }

  if (!settings.catalogId) {
    return {
      ok: false,
      message: "No Meta catalog ID configured in the Facebook Ads settings.",
      synced: 0,
    };
  }

  await connection();

  const products = await Product.find({}).limit(limit).lean();

  const catalogItems = products
    .map((product: any) => {
      const itemName = product.name || product.title || "Product";
      const description =
        product.description ||
        product.short_description ||
        product.meta_description ||
        "Product from Nova Horizon";
      const price =
        product.price || product.price_value || product.current_price || 0;
      const imageUrl =
        product.image ||
        product.images?.[0] ||
        product.featured_image ||
        product.thumbnail ||
        "";
      const productId = product._id?.toString() || product.id || itemName;

      return {
        retailer_id: productId,
        name: itemName,
        description,
        price: Number(price) || 0,
        currency: "USD",
        image_url: imageUrl,
        link:
          product.url ||
          `${process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"}/products/${productId}`,
        product_type: product.category || "General",
      };
    })
    .filter((product) => product.name && product.retailer_id);

  if (catalogItems.length === 0) {
    return {
      ok: false,
      message: "No product catalog items were available to sync.",
      synced: 0,
    };
  }

  let synced = 0;
  const errors: string[] = [];

  for (const item of catalogItems) {
    const params = new URLSearchParams({
      access_token: settings.accessToken as string,
      retailer_id: String(item.retailer_id),
      name: item.name,
      description: item.description,
      price: String(item.price),
      currency: item.currency,
      product_type: item.product_type,
    });

    if (item.image_url) params.set("image_url", item.image_url);
    if (item.link) params.set("link", item.link);

    const response = await fetch(
      `https://graph.facebook.com/${settings.apiVersion || "v20.0"}/${settings.catalogId}/products`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );

    const payload = await response.json();

    if (!response.ok || payload.error) {
      errors.push(payload?.error?.message || "Unknown product sync error");
      continue;
    }

    synced += 1;
  }

  return {
    ok: synced > 0,
    message:
      synced > 0
        ? `Synced ${synced} product(s) to Meta catalog.`
        : errors[0] || "No products could be synced to Meta.",
    synced,
    errors,
  };
}

/* ============================ create (Meta) ========================= */

export async function createFacebookCampaign(input: {
  name: string;
  objective?: FacebookAdsConnectionInput["defaultObjective"];
  status?: "ACTIVE" | "PAUSED";
}) {
  const settings = await getFacebookAdsSettings();

  if (!settings) {
    return {
      ok: false,
      message: "No Facebook Ads connection is configured yet.",
      campaign: null,
    };
  }

  const sanitizedName = input.name?.trim();
  if (!sanitizedName) {
    return {
      ok: false,
      message: "Campaign name is required.",
      campaign: null,
    };
  }

  const objectiveMap: Record<
    FacebookAdsConnectionInput["defaultObjective"],
    string
  > = {
    sales: "OUTCOME_SALES",
    leads: "OUTCOME_LEADS",
    traffic: "OUTCOME_TRAFFIC",
    awareness: "OUTCOME_AWARENESS",
    engagement: "OUTCOME_ENGAGEMENT",
    catalog_sales: "OUTCOME_CATALOG_SALES",
  };

  const statusMap = {
    ACTIVE: 1,
    PAUSED: 2,
  } as const;

  const selectedObjective = (input.objective ||
    (settings.defaultObjective as FacebookAdsConnectionInput["defaultObjective"]) ||
    "sales") as FacebookAdsConnectionInput["defaultObjective"];

  const body = new URLSearchParams({
    access_token: settings.accessToken as string,
    name: sanitizedName,
    objective: objectiveMap[selectedObjective],
    status: String(statusMap[input.status || "PAUSED"]),
  });

  const response = await fetch(
    `https://graph.facebook.com/${settings.apiVersion || "v20.0"}/${settings.adAccountId}/campaigns`,
    {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  const payload = await response.json();

  if (!response.ok || payload.error) {
    return {
      ok: false,
      message:
        payload?.error?.message || "Failed to create campaign on Facebook.",
      campaign: null,
    };
  }

  return {
    ok: true,
    message: "Campaign created successfully in Meta.",
    campaign: payload,
  };
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
  const settings = await getFacebookAdsSettings();

  if (!settings) {
    return {
      ok: false,
      message: "No Facebook Ads connection is configured yet.",
      adSet: null,
    };
  }

  const sanitizedName = input.name?.trim();
  if (!sanitizedName || !input.campaignId) {
    return {
      ok: false,
      message: "Ad set name and campaign ID are required.",
      adSet: null,
    };
  }

  const optimizationGoalMap = {
    LINK_CLICKS: "LINK_CLICKS",
    OFFSITE_CONVERSIONS: "OFFSITE_CONVERSIONS",
    REACH: "REACH",
    POST_ENGAGEMENT: "POST_ENGAGEMENT",
    CONVERSIONS: "CONVERSIONS",
    THR: "THR",
  } as const;

  const billingEventMap = {
    IMPRESSIONS: "IMPRESSIONS",
    LINK_CLICKS: "LINK_CLICKS",
  } as const;

  const statusMap = {
    ACTIVE: 1,
    PAUSED: 2,
  } as const;

  const body = new URLSearchParams({
    access_token: settings.accessToken as string,
    name: sanitizedName,
    campaign_id: input.campaignId,
    optimization_goal:
      optimizationGoalMap[input.optimizationGoal || "LINK_CLICKS"],
    billing_event: billingEventMap[input.billingEvent || "IMPRESSIONS"],
    status: String(statusMap[input.status || "PAUSED"]),
    daily_budget: String((input.dailyBudget ?? 1000) * 100),
  });

  if (input.targeting && Object.keys(input.targeting).length > 0) {
    body.set("targeting", JSON.stringify(input.targeting));
  }

  const response = await fetch(
    `https://graph.facebook.com/${settings.apiVersion || "v20.0"}/${settings.adAccountId}/adsets`,
    {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  const payload = await response.json();

  if (!response.ok || payload.error) {
    return {
      ok: false,
      message: payload?.error?.message || "Failed to create Meta ad set.",
      adSet: null,
    };
  }

  return {
    ok: true,
    message: "Ad set created successfully in Meta.",
    adSet: payload,
  };
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
  const settings = await getFacebookAdsSettings();

  if (!settings) {
    return {
      ok: false,
      message: "No Facebook Ads connection is configured yet.",
      creative: null,
    };
  }

  const sanitizedName = input.name?.trim();
  if (!sanitizedName || !input.linkUrl) {
    return {
      ok: false,
      message: "Creative name and destination URL are required.",
      creative: null,
    };
  }

  const pageId = input.pageId || (settings.pageId as string);
  if (!pageId) {
    return {
      ok: false,
      message: "Meta page ID is required to create the ad creative.",
      creative: null,
    };
  }

  const callToActionMap = {
    LEARN_MORE: "LEARN_MORE",
    SHOP_NOW: "SHOP_NOW",
    VISIT_SITE: "VISIT_SITE",
    ORDER_NOW: "ORDER_NOW",
  } as const;

  const payload = {
    access_token: settings.accessToken as string,
    name: sanitizedName,
    objective: settings.defaultObjective || "sales",
    image_url: input.imageUrl || "",
    title: input.headline || "Shop now",
    body: input.body || "Explore our latest products.",
    link_url: input.linkUrl,
    call_to_action: {
      type: callToActionMap[input.callToAction || "SHOP_NOW"],
      value: { link: input.linkUrl },
    },
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link: input.linkUrl,
        image_url: input.imageUrl || "",
        message: input.body || "Explore our latest products.",
        call_to_action: {
          type: callToActionMap[input.callToAction || "SHOP_NOW"],
          value: { link: input.linkUrl },
        },
      },
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/${settings.apiVersion || "v20.0"}/${pageId}/adcreatives`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await response.json();

  if (!response.ok || result.error) {
    return {
      ok: false,
      message: result?.error?.message || "Failed to create Meta ad creative.",
      creative: null,
    };
  }

  return {
    ok: true,
    message: "Ad creative created successfully in Meta.",
    creative: result,
  };
}

export async function createFacebookAd(input: {
  name: string;
  adSetId: string;
  creativeId: string;
  status?: "ACTIVE" | "PAUSED";
}) {
  const settings = await getFacebookAdsSettings();

  if (!settings) {
    return {
      ok: false,
      message: "No Facebook Ads connection is configured yet.",
      ad: null,
    };
  }

  const sanitizedName = input.name?.trim();
  if (!sanitizedName || !input.adSetId || !input.creativeId) {
    return {
      ok: false,
      message: "Ad name, ad set ID, and creative ID are required.",
      ad: null,
    };
  }

  const statusMap = {
    ACTIVE: 1,
    PAUSED: 2,
  } as const;

  const response = await fetch(
    `https://graph.facebook.com/${settings.apiVersion || "v20.0"}/${settings.adAccountId}/ads`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: settings.accessToken,
        name: sanitizedName,
        adset_id: input.adSetId,
        creative: {
          creative_id: input.creativeId,
        },
        status: statusMap[input.status || "PAUSED"],
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok || payload.error) {
    return {
      ok: false,
      message: payload?.error?.message || "Failed to create Meta ad.",
      ad: null,
    };
  }

  return {
    ok: true,
    message: "Ad created successfully in Meta.",
    ad: payload,
  };
}

/* ============================== insights ============================ */

export async function getCampaignInsights(campaignId: string) {
  const settings = await getFacebookAdsSettings();

  if (!settings) {
    return {
      ok: false,
      message: "No Facebook Ads connection is configured yet.",
      insights: null,
    };
  }

  if (!campaignId) {
    return {
      ok: false,
      message: "Campaign ID is required.",
      insights: null,
    };
  }

  const fieldsParam = encodeURIComponent(
    "spend,impressions,clicks,actions,action_values,cost_per_action_type,ctr,cpp,cpc",
  );

  const response = await fetch(
    `https://graph.facebook.com/${settings.apiVersion || "v20.0"}/${campaignId}/insights?fields=${fieldsParam}&access_token=${encodeURIComponent(settings.accessToken as string)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      message: `Failed to fetch campaign insights: ${errorText}`,
      insights: null,
    };
  }

  const payload = await response.json();
  const data = Array.isArray(payload.data) ? payload.data[0] : null;

  if (!data) {
    return {
      ok: true,
      message: "No insights data available yet.",
      insights: {
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
      },
    };
  }

  return {
    ok: true,
    message: "Campaign insights retrieved.",
    insights: {
      spend: parseFloat(data.spend || "0"),
      impressions: parseInt(data.impressions || "0"),
      clicks: parseInt(data.clicks || "0"),
      ctr: parseFloat(data.ctr || "0"),
      cpc: parseFloat(data.cpc || "0"),
      conversions:
        data.actions?.find((a: any) => a.action_type === "omni_purchase")
          ?.value || 0,
    },
  };
}

export async function getAdSetInsights(adSetId: string) {
  const settings = await getFacebookAdsSettings();

  if (!settings) {
    return {
      ok: false,
      message: "No Facebook Ads connection is configured yet.",
      insights: null,
    };
  }

  if (!adSetId) {
    return {
      ok: false,
      message: "Ad set ID is required.",
      insights: null,
    };
  }

  const fieldsParam = encodeURIComponent(
    "spend,impressions,clicks,actions,cost_per_action_type,ctr,cpc",
  );

  const response = await fetch(
    `https://graph.facebook.com/${settings.apiVersion || "v20.0"}/${adSetId}/insights?fields=${fieldsParam}&access_token=${encodeURIComponent(settings.accessToken as string)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      message: `Failed to fetch ad set insights: ${errorText}`,
      insights: null,
    };
  }

  const payload = await response.json();
  const data = Array.isArray(payload.data) ? payload.data[0] : null;

  if (!data) {
    return {
      ok: true,
      message: "No insights data available yet.",
      insights: {
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
      },
    };
  }

  return {
    ok: true,
    message: "Ad set insights retrieved.",
    insights: {
      spend: parseFloat(data.spend || "0"),
      impressions: parseInt(data.impressions || "0"),
      clicks: parseInt(data.clicks || "0"),
      ctr: parseFloat(data.ctr || "0"),
      cpc: parseFloat(data.cpc || "0"),
      conversions:
        data.actions?.find((a: any) => a.action_type === "omni_purchase")
          ?.value || 0,
    },
  };
}
