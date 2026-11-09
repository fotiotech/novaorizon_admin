// models/Block.ts
import mongoose, { Schema } from "mongoose";
import {
  BLOCK_LOCATIONS,
  BLOCK_DISPLAYS,
  BLOCK_SOURCE_TYPES,
  PROMOTION_MODES,
  BLOCK_REF_MODELS,
  BLOCK_THEMES,
  BLOCK_ANIMATIONS,
  BLOCK_ALIGNMENTS,
  CTA_STYLES,
  CARD_SHAPES,
  CARD_RATIOS,
  CARD_SIZES,
  TITLE_POSITIONS,
  IMAGE_POSITIONS,
  DEFAULT_BLOCK_DISPLAY_CONFIG,
  DEFAULT_BLOCK_SOURCE_STYLES,
  MAX_BLOCK_LIMIT,
} from "@/lib/content/constants";

const ManualRefSchema = new Schema(
  {
    refModel: { type: String, enum: BLOCK_REF_MODELS, required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

const HeadingSchema = new Schema(
  {
    title: { type: String, default: "", trim: true },
    subtitle: { type: String, default: "", trim: true },
    showHeading: { type: Boolean, default: true },
  },
  { _id: false },
);

const DisplayConfigSchema = new Schema(
  {
    theme: {
      type: String,
      enum: BLOCK_THEMES,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.theme,
    },
    columns: {
      type: Number,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.columns,
      min: 1,
      max: 6,
    },
    gap: {
      type: Number,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.gap,
      min: 0,
      max: 64,
    },
    borderless: {
      type: Boolean,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.borderless,
    },
    rounded: { type: Boolean, default: DEFAULT_BLOCK_DISPLAY_CONFIG.rounded },
    shadow: { type: Boolean, default: DEFAULT_BLOCK_DISPLAY_CONFIG.shadow },
    alignment: {
      type: String,
      enum: BLOCK_ALIGNMENTS,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.alignment,
    },
    animation: {
      type: String,
      enum: BLOCK_ANIMATIONS,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.animation,
    },
    cardShape: {
      type: String,
      enum: CARD_SHAPES,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.cardShape,
    },
    cardRatio: {
      type: String,
      enum: CARD_RATIOS,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.cardRatio,
    },
    cardSize: {
      type: String,
      enum: CARD_SIZES,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.cardSize,
    },
    titlePosition: {
      type: String,
      enum: TITLE_POSITIONS,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.titlePosition,
    },
    imagePosition: {
      type: String,
      enum: IMAGE_POSITIONS,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.imagePosition,
    },
    backgroundColor: {
      type: String,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.backgroundColor,
      trim: true,
    },
    textColor: {
      type: String,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.textColor,
      trim: true,
    },
  },
  { _id: false },
);

const SourceStylesSchema = new Schema(
  {
    promotionBadgeStyle: {
      type: String,
      default: DEFAULT_BLOCK_SOURCE_STYLES.promotionBadgeStyle,
    },
    promotionShowCode: {
      type: Boolean,
      default: DEFAULT_BLOCK_SOURCE_STYLES.promotionShowCode,
    },
    collectionShowItemCount: {
      type: Boolean,
      default: DEFAULT_BLOCK_SOURCE_STYLES.collectionShowItemCount,
    },
    collectionCountPosition: {
      type: String,
      default: DEFAULT_BLOCK_SOURCE_STYLES.collectionCountPosition,
    },
    manualCardSize: {
      type: String,
      default: DEFAULT_BLOCK_SOURCE_STYLES.manualCardSize,
    },
    manualCardVariant: {
      type: String,
      default: DEFAULT_BLOCK_SOURCE_STYLES.manualCardVariant,
    },
    manualShowDescription: {
      type: Boolean,
      default: DEFAULT_BLOCK_SOURCE_STYLES.manualShowDescription,
    },
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

const SourceSchema = new Schema(
  {
    type: { type: String, enum: BLOCK_SOURCE_TYPES, required: true },
    collectionId: { type: Schema.Types.ObjectId, ref: "Collection" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    promotionId: { type: Schema.Types.ObjectId, ref: "Promotion" },
    // Multiple banners per block. Order is preserved.
    bannerIds: [{ type: Schema.Types.ObjectId, ref: "BannerContent" }],
    promotionMode: {
      type: String,
      enum: PROMOTION_MODES,
      default: "products",
    },
    items: { type: [ManualRefSchema], default: [] },
  },
  { _id: false },
);

const BlockSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    location: {
      type: String,
      enum: BLOCK_LOCATIONS,
      required: true,
      index: true,
    },
    display: {
      type: String,
      enum: BLOCK_DISPLAYS,
      default: "grid",
    },
    source: { type: SourceSchema, required: true },
    heading: { type: HeadingSchema, default: () => ({}) },
    displayConfig: { type: DisplayConfigSchema, default: () => ({}) },
    sourceStyles: { type: SourceStylesSchema, default: () => ({}) },
    cta: { type: CtaSchema, default: () => ({}) },
    limit: { type: Number, default: 12, min: 1, max: MAX_BLOCK_LIMIT },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    order: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

BlockSchema.pre("validate", function (next) {
  const t = this.source?.type;
  if (!t) return next(new Error("A content source is required."));
  if (t === "banner") {
    const ids = this.source.bannerIds ?? [];
    if (!ids.length) {
      return next(new Error("Banner source requires at least one bannerId."));
    }
  }
  next();
});

BlockSchema.index({ location: 1, status: 1, order: 1 });
BlockSchema.index({ "source.collectionId": 1 });
BlockSchema.index({ "source.categoryId": 1 });
BlockSchema.index({ "source.promotionId": 1 });
BlockSchema.index({ "source.bannerIds": 1 });

export const Block =
  mongoose.models.Block || mongoose.model("Block", BlockSchema);

export type BlockDoc = mongoose.InferSchemaType<typeof BlockSchema>;
