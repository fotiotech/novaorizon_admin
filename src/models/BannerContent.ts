// models/BannerContent.ts
import mongoose, { Schema } from "mongoose";
import { CTA_STYLES } from "@/lib/content/constants";

const HeadingSchema = new Schema(
  {
    title: { type: String, default: "", trim: true },
    subtitle: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const CtaSchema = new Schema(
  {
    text: { type: String, default: "", trim: true },
    link: { type: String, default: "", trim: true },
    style: { type: String, enum: CTA_STYLES, default: "none" },
  },
  { _id: false },
);

/**
 * A banner is a single hero unit — one image, one headline, one CTA.
 * Blocks reference several banners (bannerIds) and choose how to lay
 * them out.
 */
const BannerContentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    eyebrow: { type: String, default: "", trim: true },
    body: { type: String, default: "" },
    heading: { type: HeadingSchema, default: () => ({}) },

    image: { type: String, default: "" },

    cta: { type: CtaSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

BannerContentSchema.pre("validate", function (next) {
  const hasAnyContent =
    Boolean(this.heading?.title) || Boolean(this.body) || Boolean(this.image);

  if (!hasAnyContent) {
    return next(
      new Error(
        "Banner needs at least a headline, body, or image to be usable.",
      ),
    );
  }
  next();
});

BannerContentSchema.index({ name: 1 });

export const BannerContent =
  mongoose.models.BannerContent ||
  mongoose.model("BannerContent", BannerContentSchema);

export type BannerContentDoc = mongoose.InferSchemaType<
  typeof BannerContentSchema
>;
