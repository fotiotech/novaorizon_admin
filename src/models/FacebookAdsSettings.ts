import mongoose, { Schema } from "mongoose";

const FacebookAdsSettingsSchema = new Schema(
  {
    accountName: { type: String, required: true },
    appId: { type: String, required: true },
    appSecret: { type: String, required: true },
    accessToken: { type: String, required: true },
    adAccountId: { type: String, required: true },
    pageId: { type: String, default: "" },
    pixelId: { type: String, default: "" },
    businessManagerId: { type: String, default: "" },
    catalogId: { type: String, default: "" },
    catalogName: { type: String, default: "" },
    catalogType: {
      type: String,
      enum: ["Ecommerce", "Travel", "RealEstate", "Auto"],
      default: "Ecommerce",
    },
    catalogEnabled: { type: Boolean, default: false },
    defaultObjective: {
      type: String,
      enum: [
        "sales",
        "leads",
        "traffic",
        "awareness",
        "engagement",
        "catalog_sales",
      ],
      default: "sales",
    },
    apiVersion: { type: String, default: "v20.0" },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

FacebookAdsSettingsSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.FacebookAdsSettings ||
  mongoose.model("FacebookAdsSettings", FacebookAdsSettingsSchema);
