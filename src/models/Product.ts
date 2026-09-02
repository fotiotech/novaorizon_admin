import mongoose, { Schema, Document, Model } from "mongoose";

// ==================== INTERFACES ====================

interface IProductCode {
  type: "EAN" | "UPC" | "ISBN" | "QR" | "MODEL";
  value: string;
}

interface IKeyValue {
  k: string;
  v: any;
  unit?: string;
}

interface ISpecificationGroup {
  name: string;
  attributes?: IKeyValue[];
  groups?: ISpecificationGroup[];
}

interface IVariant {
  attributes: IKeyValue[];
  sku: string;
  price: number;
  quantity: number;
  mainImage?: string;
  images?: string[];
}

interface IReview {
  user: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
}

// Related product now an array of objects
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
  variantValues: IKeyValue[];
  keyFeatures: IKeyValue[];
  specifications: ISpecificationGroup[];
  quantity: number;
  lowStockThreshold: number;
  listPrice: number;
  price: number;
  mainImage: string;
  images: string[];
  description: string;
  shortDescription: string;
  variants: IVariant[];
  carrier?: mongoose.Types.ObjectId;
  relatedProducts: IRelatedProduct[]; // changed
  reviewsRatings: IReview[];
  tags: string[];
  status: "draft" | "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

// ==================== SUB‑SCHEMAS ====================

const ProductCodeSchema = new Schema<IProductCode>({
  type: {
    type: String,
    enum: ["EAN", "UPC", "ISBN", "QR", "MODEL"],
    required: true,
  },
  value: { type: String, required: true },
});

const KeyValueSchema = new Schema<IKeyValue>({
  k: { type: String, required: true, trim: true },
  v: { type: Schema.Types.Mixed, required: true },
  unit: { type: String, trim: true },
});

const SpecificationGroupSchema = new Schema<ISpecificationGroup>({
  name: { type: String, required: true, trim: true },
  attributes: { type: [KeyValueSchema], default: [] },
  groups: { type: [Schema.Types.Mixed], default: [] },
});

const VariantSchema = new Schema<IVariant>({
  attributes: { type: [KeyValueSchema], default: [] },
  sku: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  mainImage: { type: String, default: "" },
  images: { type: [String], default: [] },
});

const ReviewSchema = new Schema<IReview>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 200 },
});

// ==================== MAIN SCHEMA ====================

const ProductSchema = new Schema<IProduct>(
  {
    productCode: { type: ProductCodeSchema, default: null },
    name: { type: String, trim: true, default: "" },
    sku: { type: String, trim: true, index: true, default: "" },
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
    variantValues: { type: [KeyValueSchema], default: [] },
    keyFeatures: { type: [KeyValueSchema], default: [] },
    specifications: { type: [SpecificationGroupSchema], default: [] },
    quantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    listPrice: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    mainImage: { type: String, default: "" },
    images: { type: [String], default: [] },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    variants: { type: [VariantSchema], default: [] },
    carrier: { type: Schema.Types.ObjectId, ref: "Carrier" },
    relatedProducts: {
      type: [
        {
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
    strict: false, // allow dynamic category attributes as top‑level fields
  },
);

// ==================== INDEXES ====================

ProductSchema.index(
  {
    name: "text",
    description: "text",
    shortDescription: "text",
    tags: "text",
    "keyFeatures.v": "text",
    "specifications.$**": "text",
  },
  {
    weights: {
      name: 10,
      description: 5,
      shortDescription: 3,
      tags: 2,
      "keyFeatures.v": 1,
      "specifications.$**": 1,
    },
    name: "ProductTextIndex",
  },
);

ProductSchema.index({ "keyFeatures.k": 1, "keyFeatures.v": 1 });
ProductSchema.index({
  "specifications.attributes.k": 1,
  "specifications.attributes.v": 1,
});
ProductSchema.index({ categoryId: 1, status: 1, price: 1 });
ProductSchema.index({ brand: 1, status: 1 });
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index(
  { "keyFeatures.k": 1, "keyFeatures.v": 1 },
  { partialFilterExpression: { status: "active" } },
);

const Product =
  (mongoose.models.Product as mongoose.Model<IProduct>) ||
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
