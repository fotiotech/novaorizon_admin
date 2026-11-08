// models/EditorialContent.ts
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
 * Editorial content is display-agnostic. Layout choice lives on the
 * block. Editors fill whatever slots they want; blocks consume what
 * they need for the chosen display.
 */
const EditorialContentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    eyebrow: { type: String, default: "", trim: true },
    body: { type: String, default: "" },
    heading: { type: HeadingSchema, default: () => ({}) },

    /** Primary hero. Used by feature layouts and the banner display. */
    image: { type: String, default: "" },
    /** Only used by the duo display. */
    secondaryImage: { type: String, default: "" },
    /** Cards. Used by grid, carousel, list, hero displays. */
    images: { type: [String], default: [] },

    cta: { type: CtaSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

EditorialContentSchema.pre("validate", function (next) {
  const hasAnyContent =
    Boolean(this.heading?.title) ||
    Boolean(this.body) ||
    Boolean(this.image) ||
    (Array.isArray(this.images) && this.images.length > 0);

  if (!hasAnyContent) {
    return next(
      new Error(
        "Editorial needs at least a headline, body, or image to be usable.",
      ),
    );
  }
  next();
});

EditorialContentSchema.index({ name: 1 });

export const EditorialContent =
  mongoose.models.EditorialContent ||
  mongoose.model("EditorialContent", EditorialContentSchema);

export type EditorialContentDoc = mongoose.InferSchemaType<
  typeof EditorialContentSchema
>;
