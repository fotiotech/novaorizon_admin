// models/Promotion.ts
import { Schema, model, models } from "mongoose";

// ─────────────────────────────────────────────────────────────────────
// Sub-schema — a single configurable field on a promotion.
// ─────────────────────────────────────────────────────────────────────
const promotionPropertySchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: [
        "text",
        "textarea",
        "number",
        "select",
        "multi-select",
        "checkbox",
        "radio",
        "boolean",
        "date",
        "color",
        "file",
        "url",
      ],
      required: true,
    },
    isRequired: { type: Boolean, default: false },
    isMultiple: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    defaultValue: { type: Schema.Types.Mixed },
    validation: {
      min: Number,
      max: Number,
      pattern: String,
      minLength: Number,
      maxLength: Number,
    },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

// ─────────────────────────────────────────────────────────────────────
// Sub-schema — the promotion's type (embedded).
// ─────────────────────────────────────────────────────────────────────
const promotionTypeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    description: { type: String, trim: true },
    calculationType: {
      type: String,
      enum: [
        "percentage",
        "fixed_amount",
        "buy_x_get_y",
        "free_shipping",
        "bundle_discount",
      ],
      required: true,
    },
    properties: { type: [promotionPropertySchema], default: [] },
    isActive: { type: Boolean, default: true },
    icon: { type: String, trim: true },
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────────────
// Sub-schema — what products the promotion applies to.
//
// The promotion is the source of truth. The storefront evaluator
// resolves "does this promotion apply to product P?" by:
//
//   appliesTo === "all"        → always applies
//   appliesTo === "products"   → P._id ∈ productIds
//   appliesTo === "categories" → P.categoryId ∈ categoryIds
//   appliesTo === "brands"     → P.brand ∈ brandIds
//
// `excludeProductIds` is a carve-out that runs after the above.
// Bundle/`buy_x_get_y` still use their own structural product lists
// inside `propertyValues` — that's definition, not scope.
// ─────────────────────────────────────────────────────────────────────
const promotionScopeSchema = new Schema(
  {
    appliesTo: {
      type: String,
      enum: ["all", "products", "categories", "brands"],
      default: "all",
    },
    productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    brandIds: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
    excludeProductIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────────────
// Main promotion schema
// ─────────────────────────────────────────────────────────────────────
const promotionSchema = new Schema(
  {
    promotionType: { type: promotionTypeSchema, required: true },

    // Which products this promotion can be applied to.
    scope: { type: promotionScopeSchema, default: () => ({}) },

    propertyValues: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },

    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },

    customerEligibility: {
      allCustomers: { type: Boolean, default: true },
      customerGroupIds: [{ type: Schema.Types.ObjectId, ref: "CustomerGroup" }],
      minOrderAmount: { type: Number, default: 0 },
    },
    usageLimits: {
      totalUses: { type: Number, default: null },
      perCustomer: { type: Number, default: null },
      perOrder: { type: Number, default: 1 },
    },
    stackable: { type: Boolean, default: false },
    exclusiveWith: [{ type: Schema.Types.ObjectId, ref: "Promotion" }],

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Primary lookup for the storefront: active promotions inside a window.
promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Filter by calculation type (admin list views, reporting).
promotionSchema.index({ "promotionType.calculationType": 1 });

// Scope lookups — resolve "which promotions apply to this product?"
promotionSchema.index({ "scope.appliesTo": 1, "scope.productIds": 1 });
promotionSchema.index({ "scope.appliesTo": 1, "scope.categoryIds": 1 });
promotionSchema.index({ "scope.appliesTo": 1, "scope.brandIds": 1 });

export const Promotion =
  models.Promotion || model("Promotion", promotionSchema);

export default Promotion;

export type PromotionPropertyDoc = {
  _id?: any;
  code: string;
  name: string;
  type: string;
  isRequired: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  sortOrder: number;
};

export type PromotionScopeDoc = {
  appliesTo: "all" | "products" | "categories" | "brands";
  productIds: any[];
  categoryIds: any[];
  brandIds: any[];
  excludeProductIds: any[];
};
