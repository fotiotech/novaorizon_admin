// app/actions/setting.ts
"use server";

import { connection } from "@/utils/connection";
import Setting, { ISetting } from "@/models/Setting";
import { revalidatePath } from "next/cache";

const DEFAULT_KEY = "general";

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
export async function getGeneralSettings(): Promise<GeneralSettings> {
  try {
    await connection();
    const doc = await Setting.findOne({ key: DEFAULT_KEY }).lean();
    return serialize(doc);
  } catch (err) {
    console.error("[getGeneralSettings] Failed:", err);
    return DEFAULTS;
  }
}

/* ------------------------------------------------------------------ */
/*  Update                                                             */
/* ------------------------------------------------------------------ */
export async function updateGeneralSettings(
  input: Partial<GeneralSettings>,
): Promise<{ success: boolean; data?: GeneralSettings; error?: string }> {
  try {
    await connection();

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

    const updated = await Setting.findOneAndUpdate(
      { key: DEFAULT_KEY },
      { $set: patch, $setOnInsert: { key: DEFAULT_KEY } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    revalidatePath("/settings/general");
    revalidatePath("/settings");

    return { success: true, data: serialize(updated) };
  } catch (err: any) {
    console.error("[updateGeneralSettings] Failed:", err);
    return { success: false, error: err?.message || "Failed to save settings" };
  }
}
