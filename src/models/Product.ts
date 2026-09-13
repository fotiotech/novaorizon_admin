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
  [key: string]: any; // dynamic theme keys (color, size, …)
}
interface IReview {
  user: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
}
interface IRelatedProduct {
  product: mongoose.Types.ObjectId;
  relationshipType?: string;
}

export interface IProduct extends Document {
  productCode: IProductCode | null;
  name: string;
  sku: string;
  slug: string;
  categoryId: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
  // ✅ Flattened category attributes live here, one key per attribute code.
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

const ReviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 200 },
  },
  { _id: false },
);

const ProductSchema = new Schema<IProduct>(
  {
    productCode: { type: ProductCodeSchema, default: null },
    name: { type: String, trim: true, default: "" },
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
    hasVariants: { type: Boolean, default: false },
    variantThemes: { type: [String], default: [] },

    // Map of { [themeCode]: string[] }, e.g. { color: ["Green","Black"] }
    variantValues: { type: Schema.Types.Mixed, default: {} },

    quantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    listPrice: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    images: { type: [String], default: [] },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },

    // Mixed — no subdoc casting so dynamic theme keys persist verbatim.
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
  },
  {
    timestamps: true,
    // ⭐ The whole point of Model B: everything else lives flat at the root.
    strict: false,
  },
);

// ==================== INDEXES ====================

// Text search on stable fields only. Attribute-specific filters use
// dedicated compound indexes you add below as your filter list evolves.
ProductSchema.index(
  {
    name: "text",
    description: "text",
    shortDescription: "text",
    tags: "text",
  },
  {
    weights: { name: 10, description: 5, shortDescription: 3, tags: 2 },
    name: "ProductTextIndex",
  },
);

ProductSchema.index({ categoryId: 1, status: 1, price: 1 });
ProductSchema.index({ brand: 1, status: 1 });
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });

// 👇 Example attribute filters. Add / remove as your filter set evolves.
ProductSchema.index({ categoryId: 1, status: 1, color: 1, price: 1 });
ProductSchema.index({ categoryId: 1, status: 1, material: 1 });
ProductSchema.index({ categoryId: 1, status: 1, size: 1 });

const Product =
  (mongoose.models.Product as mongoose.Model<IProduct>) ||
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
