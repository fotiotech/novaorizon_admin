// models/MetaTagUrl.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IMetaTagUrl extends Document {
  url: string;
  urlPattern?: string;
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  robots?: string;
  priority: number;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  isActive: boolean;
  lastModified: Date;
  createdBy: string;
}

const MetaTagUrlSchema: Schema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    urlPattern: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
    canonicalUrl: {
      type: String,
      trim: true,
    },
    ogTitle: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    ogDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    ogImage: {
      type: String,
      trim: true,
    },
    ogType: {
      type: String,
      enum: ["website", "article", "product", "profile", "video"],
      default: "website",
    },
    twitterCard: {
      type: String,
      enum: ["summary", "summary_large_image", "app", "player"],
      default: "summary_large_image",
    },
    twitterTitle: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    twitterDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    twitterImage: {
      type: String,
      trim: true,
    },
    robots: {
      type: String,
      enum: [
        "index, follow",
        "noindex, follow",
        "index, nofollow",
        "noindex, nofollow",
      ],
      default: "index, follow",
    },
    priority: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    changeFrequency: {
      type: String,
      enum: [
        "always",
        "hourly",
        "daily",
        "weekly",
        "monthly",
        "yearly",
        "never",
      ],
      default: "weekly",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      required: true,
      default: "admin",
    },
  },
  {
    timestamps: true,
  }
);

// Add unique index for URL
MetaTagUrlSchema.index({ url: 1 }, { unique: true });

// Other indexes for better query performance
MetaTagUrlSchema.index({ isActive: 1 });
MetaTagUrlSchema.index({ createdAt: -1 });
MetaTagUrlSchema.index({ urlPattern: 1 });

export default mongoose.models.MetaTagUrl ||
  mongoose.model<IMetaTagUrl>("MetaTagUrl", MetaTagUrlSchema);
