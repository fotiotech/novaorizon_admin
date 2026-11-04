// models/Product.ts
import mongoose, { Schema, Document } from "mongoose";

interface IProductCode {
  type: "EAN" | "UPC" | "ISBN" | "QR" | "MODEL";
  value: string;
}
interface IVariant {
  attributes?: Record<string, any>;
  sku?: string;
  price?: number;
  quantity?: number;
  mainImage?: string;
  images?: string[];
  [key: string]: any;
}
interface IReview {
  _id?: mongoose.Types.ObjectId;
  user:
    | mongoose.Types.ObjectId
    | { _id: mongoose.Types.ObjectId; name: string };
  rating: number;
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
interface IRelatedProduct {
  product: mongoose.Types.ObjectId;
  relationshipType?: string;
}

export interface IProduct extends Document {
  productCode: IProductCode | null;
  name: string;
  name_autocomplete: string;
  sku: string;
  slug: string;
  categoryId: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId;
  categoryName: string;
  brandName: string;
  hasVariants: boolean;
  variantThemes: string[];
  variantValues: Record<string, string[]>;
  quantity: number;
  lowStockThreshold: number;
  listPrice: number;
  price: number;
  images: string[];
  description: string;
  shortDescription: string;
  variants: IVariant[];
  carrier?: mongoose.Types.ObjectId;
  relatedProducts: IRelatedProduct[];
  reviewsRatings: IReview[];
  tags: string[];
  status: "draft" | "active" | "inactive";

  // ── Materialized recommendation signals ──────────────────────────
  isFeatured: boolean; // admin-set
  isBestseller: boolean; // cron-set (30d purchase count)
  bestsellerRank: number; // 1..N, 0 = unranked
  isTrending: boolean; // cron-set (7d weighted events)
  trendingRank: number; // 1..N, 0 = unranked
  isNew: boolean; // cron-set (createdAt within window)
  metricsUpdatedAt?: Date; // when cron last touched this doc

  embedding: number[];
  embeddingText: string;
  embeddingModel: string;
  embeddedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

const ProductCodeSchema = new Schema<IProductCode>(
  {
    type: {
      type: String,
      enum: ["EAN", "UPC", "ISBN", "QR", "MODEL"],
      required: true,
    },
    value: { type: String, required: true },
  },
  { _id: false },
);

// models/Product.ts (excerpt)

const ReviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 1000 },
  },
  // _id defaults to true, which gives us a stable React key.
  // timestamps give us createdAt/updatedAt for display + sorting.
  { _id: true, timestamps: true },
);

const ProductSchema = new Schema<IProduct>(
  {
    productCode: { type: ProductCodeSchema, default: null },
    name: { type: String, trim: true, default: "" },
    name_autocomplete: { type: String, trim: true, default: "" },
    sku: { type: String, trim: true, default: "" },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      unique: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    categoryName: { type: String, trim: true, default: "" },
    brandName: { type: String, trim: true, default: "" },
    hasVariants: { type: Boolean, default: false },
    variantThemes: { type: [String], default: [] },
    variantValues: { type: Schema.Types.Mixed, default: {} },
    quantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    listPrice: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    images: { type: [String], default: [] },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    variants: { type: [Schema.Types.Mixed], default: [] },
    carrier: { type: Schema.Types.ObjectId, ref: "Carrier" },
    relatedProducts: {
      type: [
        {
          _id: false,
          product: { type: Schema.Types.ObjectId, ref: "Product" },
          relationshipType: { type: String },
        },
      ],
      default: [],
    },
    reviewsRatings: { type: [ReviewSchema], default: [] },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["draft", "active", "inactive"],
      default: "draft",
      index: true,
    },

    // ── Materialized recommendation signals ────────────────────────
    isFeatured: { type: Boolean, default: false, index: true },
    isBestseller: { type: Boolean, default: false, index: true },
    bestsellerRank: { type: Number, default: 0 },
    isTrending: { type: Boolean, default: false, index: true },
    trendingRank: { type: Number, default: 0 },
    isNew: { type: Boolean, default: false, index: true },
    metricsUpdatedAt: { type: Date },

    embedding: { type: [Number], default: [] },
    embeddingText: { type: String, default: "" },
    embeddingModel: { type: String, default: "" },
    embeddedAt: { type: Date },
  },
  {
    timestamps: true,
    strict: false,
  },
);

ProductSchema.pre("save", function (next) {
  if (this.isModified("name") || !this.name_autocomplete) {
    this.name_autocomplete = this.name;
  }
  next();
});

ProductSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as any;
  const newName = update?.name ?? update?.$set?.name;
  if (newName) {
    if (update.$set) update.$set.name_autocomplete = newName;
    else update.name_autocomplete = newName;
  }
  next();
});

ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ status: 1, categoryId: 1, createdAt: -1 });
ProductSchema.index({ status: 1, categoryId: 1, price: 1 });
ProductSchema.index({ status: 1, categoryId: 1, color: 1, price: 1 });
ProductSchema.index({ createdAt: -1 });

// Compound indexes so rule-based collections on the materialized flags
// can sort by rank in the same index scan.
ProductSchema.index({ isTrending: 1, trendingRank: 1 });
ProductSchema.index({ isBestseller: 1, bestsellerRank: 1 });
ProductSchema.index({ isFeatured: 1, createdAt: -1 });
ProductSchema.index({ isNew: 1, createdAt: -1 });

const Product =
  (mongoose.models.Product as mongoose.Model<IProduct>) ||
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
