import mongoose, { Schema, Document } from "mongoose";
import type { RobotsValue } from "@/app/lib/seo-defaults";

export interface ISeoSetting extends Document {
  key: string;
  siteName: string;
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImage: string;
  robots: RobotsValue;
  createdAt?: Date;
  updatedAt?: Date;
}

const seoSettingSchema = new Schema<ISeoSetting>(
  {
    // Singleton key — always "default" for now. Keeps the door open
    // for per-locale / per-tenant settings later.
    key: { type: String, required: true, unique: true, default: "default" },
    siteName: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    keywords: { type: String, default: "" },
    canonicalUrl: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    robots: {
      type: String,
      enum: ["index,follow", "noindex,nofollow"],
      default: "index,follow",
    },
  },
  { timestamps: true },
);

const SeoSetting =
  mongoose.models.SeoSetting ||
  mongoose.model<ISeoSetting>("SeoSetting", seoSettingSchema);

export default SeoSetting;
