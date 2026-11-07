// models/Collection.ts
import mongoose, { Schema } from "mongoose";
import {
  TARGET_TYPES,
  DISPLAY_LAYOUTS,
  CARD_SHAPES,
  CTA_STYLES,
  COLLECTION_TYPES,
  DEFAULT_COLLECTION_DISPLAY,
  type TargetType,
} from "@/lib/content/collectionTypes";

/* -------------------------------------------------------------------------- */
/*                                Sub-schemas                                 */
/* -------------------------------------------------------------------------- */

const ruleSchema = new Schema({
  attribute: { type: String, required: true },
  operator: {
    type: String,
    enum: ["$in", "$nin", "$eq", "$ne", "$lt", "$lte", "$gt", "$gte"],
    required: true,
  },
  value: { type: Schema.Types.Mixed, required: true },
  position: { type: Number, required: true, min: 0 },
});

const displaySchema = new Schema(
  {
    layout: {
      type: String,
      enum: DISPLAY_LAYOUTS,
      default: DEFAULT_COLLECTION_DISPLAY.layout,
    },
    columns: {
      type: Number,
      default: DEFAULT_COLLECTION_DISPLAY.columns,
      min: 1,
      max: 6,
    },
    gap: {
      type: Number,
      default: DEFAULT_COLLECTION_DISPLAY.gap,
      min: 0,
      max: 64,
    },
    showImages: {
      type: Boolean,
      default: DEFAULT_COLLECTION_DISPLAY.showImages,
    },
    cardShape: {
      type: String,
      enum: CARD_SHAPES,
      default: DEFAULT_COLLECTION_DISPLAY.cardShape,
    },
  },
  { _id: false },
);

const sortSchema = new Schema(
  {
    field: { type: String },
    direction: { type: String, enum: ["asc", "desc"], default: "asc" },
  },
  { _id: false },
);

/* -------------------------------------------------------------------------- */
/*                                Root schema                                 */
/* -------------------------------------------------------------------------- */

const CollectionSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },

    type: {
      type: String,
      enum: COLLECTION_TYPES,
      default: "rule",
    },
    targetType: {
      type: String,
      enum: TARGET_TYPES,
      required: true,
      index: true,
    },

    // Only used when type === "recommendation".
    recommendationType: {
      type: String,
      enum: ["personalized", "recentlyViewed"],
    },
    recommendationLimit: { type: Number, default: 10, min: 1, max: 100 },

    items: [{ type: Schema.Types.ObjectId, refPath: "targetType" }],
    rules: [ruleSchema],

    // Optional sort for rule collections.
    sort: { type: sortSchema, default: undefined },

    display: { type: displaySchema, default: () => ({}) },

    ctaText: { type: String },
    ctaLink: { type: String },
    ctaStyle: { type: String, enum: CTA_STYLES, default: "none" },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    order: { type: Number, default: 0, min: 0 },
    showName: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

CollectionSchema.pre("save", function (next) {
  if (this.rules?.length) {
    this.rules.sort((a, b) => a.position - b.position);
  }
  next();
});

CollectionSchema.index({ targetType: 1, name: 1 }, { unique: true });
CollectionSchema.index({ status: 1, targetType: 1, order: 1 });
CollectionSchema.index({ "rules.attribute": 1 });

export const Collection =
  mongoose.models.Collection || mongoose.model("Collection", CollectionSchema);

export {
  TARGET_TYPES,
  DISPLAY_LAYOUTS,
  CARD_SHAPES,
  CTA_STYLES,
  COLLECTION_TYPES,
};
export type { TargetType };
