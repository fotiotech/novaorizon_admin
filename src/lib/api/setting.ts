// lib/api/setting.ts
import api from "@/lib/api";

/**
 * General store settings live in the Express backend
 * (`/api/settings/general`). Client-side replacement for the old
 * `app/actions/setting.ts`.
 */

export interface GeneralSettings {
  storeName: string;
  storeTagline: string;
  storeDescription: string;
  contactEmail: string;
  contactPhone: string;
  supportEmail: string;
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  currency: string;
  currencySymbol: string;
  timezone: string;
  language: string;
  orderPrefix: string;
  lowStockThreshold: number;
  maintenanceMode: boolean;
  logoUrl: string;
  faviconUrl: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    twitter: string;
    tiktok: string;
    youtube: string;
  };
  businessHours: string;
}

const DEFAULTS: GeneralSettings = {
  storeName: "",
  storeTagline: "",
  storeDescription: "",
  contactEmail: "",
  contactPhone: "",
  supportEmail: "",
  address: {
    street: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
  },
  currency: "XAF",
  currencySymbol: "CFA",
  timezone: "Africa/Douala",
  language: "en",
  orderPrefix: "ORD",
  lowStockThreshold: 5,
  maintenanceMode: false,
  logoUrl: "",
  faviconUrl: "",
  socialLinks: {
    facebook: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    youtube: "",
  },
  businessHours: "",
};

function serialize(doc: any): GeneralSettings {
  if (!doc) return DEFAULTS;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    storeName: obj.storeName ?? "",
    storeTagline: obj.storeTagline ?? "",
    storeDescription: obj.storeDescription ?? "",
    contactEmail: obj.contactEmail ?? "",
    contactPhone: obj.contactPhone ?? "",
    supportEmail: obj.supportEmail ?? "",
    address: {
      street: obj.address?.street ?? "",
      city: obj.address?.city ?? "",
      region: obj.address?.region ?? "",
      postalCode: obj.address?.postalCode ?? "",
      country: obj.address?.country ?? "",
    },
    currency: obj.currency ?? "XAF",
    currencySymbol: obj.currencySymbol ?? "CFA",
    timezone: obj.timezone ?? "Africa/Douala",
    language: obj.language ?? "en",
    orderPrefix: obj.orderPrefix ?? "ORD",
    lowStockThreshold:
      typeof obj.lowStockThreshold === "number" ? obj.lowStockThreshold : 5,
    maintenanceMode: !!obj.maintenanceMode,
    logoUrl: obj.logoUrl ?? "",
    faviconUrl: obj.faviconUrl ?? "",
    socialLinks: {
      facebook: obj.socialLinks?.facebook ?? "",
      instagram: obj.socialLinks?.instagram ?? "",
      twitter: obj.socialLinks?.twitter ?? "",
      tiktok: obj.socialLinks?.tiktok ?? "",
      youtube: obj.socialLinks?.youtube ?? "",
    },
    businessHours: obj.businessHours ?? "",
  };
}

/* ------------------------------------------------------------------ */
/*  Read                                                               */
/* ------------------------------------------------------------------ */

/** GET /api/settings/general — public. Falls back to defaults on error. */
export async function getGeneralSettings(): Promise<GeneralSettings> {
  try {
    const res = await api.get<{ data: any }>("/settings/general");
    return serialize(res.data?.data);
  } catch (err) {
    console.error("[getGeneralSettings] Failed:", err);
    return DEFAULTS;
  }
}

/* ------------------------------------------------------------------ */
/*  Update                                                             */
/* ------------------------------------------------------------------ */

/** PATCH /api/settings/general — admin only. */
export async function updateGeneralSettings(
  input: Partial<GeneralSettings>,
): Promise<{ success: boolean; data?: GeneralSettings; error?: string }> {
  try {
    // Only accept known keys
    const patch: Record<string, any> = {};
    const stringFields: (keyof GeneralSettings)[] = [
      "storeName",
      "storeTagline",
      "storeDescription",
      "contactEmail",
      "contactPhone",
      "supportEmail",
      "currency",
      "currencySymbol",
      "timezone",
      "language",
      "orderPrefix",
      "logoUrl",
      "faviconUrl",
      "businessHours",
    ];

    for (const field of stringFields) {
      if (input[field] !== undefined) {
        patch[field] = String(input[field] ?? "").trim();
      }
    }

    if (input.lowStockThreshold !== undefined) {
      const n = Number(input.lowStockThreshold);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        return {
          success: false,
          error: "Low-stock threshold must be a non-negative whole number",
        };
      }
      patch.lowStockThreshold = n;
    }

    if (input.maintenanceMode !== undefined) {
      patch.maintenanceMode = !!input.maintenanceMode;
    }

    if (input.address && typeof input.address === "object") {
      patch.address = {
        street: String(input.address.street ?? "").trim(),
        city: String(input.address.city ?? "").trim(),
        region: String(input.address.region ?? "").trim(),
        postalCode: String(input.address.postalCode ?? "").trim(),
        country: String(input.address.country ?? "").trim(),
      };
    }

    if (input.socialLinks && typeof input.socialLinks === "object") {
      patch.socialLinks = {
        facebook: String(input.socialLinks.facebook ?? "").trim(),
        instagram: String(input.socialLinks.instagram ?? "").trim(),
        twitter: String(input.socialLinks.twitter ?? "").trim(),
        tiktok: String(input.socialLinks.tiktok ?? "").trim(),
        youtube: String(input.socialLinks.youtube ?? "").trim(),
      };
    }

    const res = await api.patch<{ success: boolean; data: any }>(
      "/settings/general",
      patch,
    );

    return { success: true, data: serialize(res.data?.data) };
  } catch (err: any) {
    const fieldErrors = err?.response?.data?.errors as
      | Record<string, string[]>
      | undefined;
    if (fieldErrors) {
      return {
        success: false,
        error:
          fieldErrors.lowStockThreshold?.[0] ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to save settings",
      };
    }
    console.error("[updateGeneralSettings] Failed:", err);
    return { success: false, error: err?.message || "Failed to save settings" };
  }
}
