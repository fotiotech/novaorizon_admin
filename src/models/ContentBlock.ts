// models/ContentBlock.ts
import mongoose, { Schema, Model, Types } from "mongoose";
import {
  BLOCK_LOCATIONS,
  BLOCK_DISPLAYS,
  BLOCK_SOURCE_TYPES,
  RECOMMENDATION_KINDS,
  PROMOTION_MODES,
  BLOCK_REF_MODELS,
  BLOCK_COLUMN_COUNTS,
  BLOCK_THEMES,
  BLOCK_ANIMATIONS,
  BLOCK_ALIGNMENTS,
  CTA_STYLES,
  DEFAULT_BLOCK_DISPLAY_CONFIG,
  DEFAULT_BLOCK_LIMIT,
  MAX_BLOCK_LIMIT,
  type BlockLocation,
  type BlockDisplay,
  type BlockSourceType,
  type RecommendationKind,
  type PromotionMode,
  type BlockRefModel,
  type BlockDisplayConfig,
  type BlockTheme,
  type BlockAnimation,
  type BlockAlignment,
  type CtaStyle,
} from "@/lib/content/constants";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export interface IBlockRef {
  _id?: Types.ObjectId;
  refId: Types.ObjectId;
  refModel: BlockRefModel;
  /** Optional display override — falls back to the ref doc's `name`. */
  label?: string | null;
  image?: string | null;
  description?: string | null;
  order: number;
}

export interface IBlockSource {
  type: BlockSourceType;

  /* collection */
  collectionId?: Types.ObjectId | null;

  /* promotion */
  promotionId?: Types.ObjectId | null;
  promotionMode?: PromotionMode;

  /* recommendation */
  recommendationKind?: RecommendationKind | null;

  /* related */
  relatedStrategy?: "auto" | "collection";
  relatedCollectionId?: Types.ObjectId | null;

  /* manual */
  refs?: IBlockRef[];

  /* shared */
  limit?: number;
}

export interface IContentBlock {
  name: string;
  description?: string;

  location: BlockLocation;
  sectionTitle?: string;
  order: number;
  visible: boolean;

  source: IBlockSource;

  display: BlockDisplay;
  columns: number;
  showImages: boolean;
  displayConfig: BlockDisplayConfig;

  ctaText?: string;
  ctaLink?: string;
  ctaStyle?: CtaStyle;

  backgroundColor?: string;
  backgroundImage?: string;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/*                                   Schemas                                  */
/* -------------------------------------------------------------------------- */

const blockRefSchema = new Schema<IBlockRef>(
  {
    refId: { type: Schema.Types.ObjectId, required: true, refPath: "refModel" },
    refModel: { type: String, enum: BLOCK_REF_MODELS, required: true },
    label: { type: String, trim: true, maxlength: 120, default: null },
    image: { type: String, trim: true, default: null },
    description: { type: String, trim: true, maxlength: 300, default: null },
    order: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

const sourceSchema = new Schema<IBlockSource>(
  {
    type: { type: String, enum: BLOCK_SOURCE_TYPES, required: true },

    collectionId: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
      default: null,
    },
    promotionId: {
      type: Schema.Types.ObjectId,
      ref: "Promotion",
      default: null,
    },
    promotionMode: { type: String, enum: PROMOTION_MODES, default: "products" },

    recommendationKind: {
      type: String,
      enum: [...RECOMMENDATION_KINDS, null],
      default: null,
    },

    relatedStrategy: {
      type: String,
      enum: ["auto", "collection"],
      default: "auto",
    },
    relatedCollectionId: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
      default: null,
    },

    refs: { type: [blockRefSchema], default: [] },

    limit: {
      type: Number,
      min: 1,
      max: MAX_BLOCK_LIMIT,
      default: DEFAULT_BLOCK_LIMIT,
    },
  },
  { _id: false },
);

sourceSchema.pre("validate", function (next) {
  const s = this as IBlockSource;
  switch (s.type) {
    case "collection":
      if (!s.collectionId) return next(new Error("collectionId is required"));
      break;
    case "promotion":
      if (!s.promotionId) return next(new Error("promotionId is required"));
      break;
    case "recommendation":
      if (!s.recommendationKind) {
        return next(new Error("recommendationKind is required"));
      }
      break;
    case "related":
      if (s.relatedStrategy === "collection" && !s.relatedCollectionId) {
        return next(
          new Error(
            "relatedCollectionId is required when strategy is 'collection'",
          ),
        );
      }
      break;
    case "manual":
      if (!s.refs?.length)
        return next(new Error("At least one ref is required"));
      break;
  }
  next();
});

const displayConfigSchema = new Schema<BlockDisplayConfig>(
  {
    theme: {
      type: String,
      enum: BLOCK_THEMES,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.theme,
    },
    gap: {
      type: Number,
      min: 0,
      max: 64,
      default: DEFAULT_BLOCK_DISPLAY_CONFIG.gap,
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
  },
  { _id: false },
);

const ContentBlockSchema = new Schema<IContentBlock>(
  {
    name: {
      type: String,
      required: [true, "Block name is required"],
      trim: true,
      maxlength: 100,
    },
    description: { type: String, trim: true, maxlength: 500 },

    location: {
      type: String,
      enum: BLOCK_LOCATIONS,
      required: true,
      index: true,
    },
    sectionTitle: { type: String, trim: true, maxlength: 120 },
    order: { type: Number, default: 0, min: 0 },
    visible: { type: Boolean, default: true },

    source: { type: sourceSchema, required: true },

    display: {
      type: String,
      enum: BLOCK_DISPLAYS,
      default: "grid",
    },
    columns: {
      type: Number,
      enum: BLOCK_COLUMN_COUNTS,
      default: 4,
    },
    showImages: { type: Boolean, default: true },
    displayConfig: {
      type: displayConfigSchema,
      default: () => ({ ...DEFAULT_BLOCK_DISPLAY_CONFIG }),
    },

    ctaText: { type: String, trim: true, maxlength: 50 },
    ctaLink: { type: String, trim: true },
    ctaStyle: { type: String, enum: CTA_STYLES, default: "link" },

    backgroundColor: { type: String, trim: true },
    backgroundImage: { type: String, trim: true },
  },
  { timestamps: true },
);

ContentBlockSchema.index({ location: 1, visible: 1, order: 1 });

export const ContentBlock: Model<IContentBlock> =
  mongoose.models.ContentBlock ||
  mongoose.model<IContentBlock>("ContentBlock", ContentBlockSchema);
