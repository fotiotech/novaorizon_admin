// models/Setting.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISetting extends Document {
  key: string; // "general" — singleton pattern for global settings
  // Store identity
  storeName: string;
  storeTagline: string;
  storeDescription: string;
  // Contact
  contactEmail: string;
  contactPhone: string;
  supportEmail: string;
  // Address
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  // Locale
  currency: string;
  currencySymbol: string;
  timezone: string;
  language: string;
  // Operations
  orderPrefix: string;
  lowStockThreshold: number;
  maintenanceMode: boolean;
  // Media
  logoUrl: string;
  faviconUrl: string;
  // Social
  socialLinks: {
    facebook: string;
    instagram: string;
    twitter: string;
    tiktok: string;
    youtube: string;
  };
  // Business hours (optional, kept simple)
  businessHours: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true, default: "general" },

    storeName: { type: String, default: "" },
    storeTagline: { type: String, default: "" },
    storeDescription: { type: String, default: "" },

    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    supportEmail: { type: String, default: "" },

    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      region: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "" },
    },

    currency: { type: String, default: "XAF" },
    currencySymbol: { type: String, default: "CFA" },
    timezone: { type: String, default: "Africa/Douala" },
    language: { type: String, default: "en" },

    orderPrefix: { type: String, default: "ORD" },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    maintenanceMode: { type: Boolean, default: false },

    logoUrl: { type: String, default: "" },
    faviconUrl: { type: String, default: "" },

    socialLinks: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },

    businessHours: { type: String, default: "" },
  },
  { timestamps: true },
);

const Setting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);

export default Setting;
