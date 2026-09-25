// models/Promotion.ts
import { Schema, model, models } from "mongoose";

// ─────────────────────────────────────────────────────────────────────
// Sub-schema — a single configurable field on a promotion.
//
// Was `models/PromotionTypeProperty.ts` (its own collection, with a
// globally-unique `code`). Now embedded per promotion, which is the
// correct scope: two promotions both defining `min_order_amount` is
// fine, they're independent.
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
  // Keep _id so React keys survive across renders when iterating the
  // array in the composer form.
  { _id: true },
);

// ─────────────────────────────────────────────────────────────────────
// Sub-schema — the promotion's type.
//
// Was `models/PromotionType.ts`. Now embedded: a promotion owns exactly
// one type definition, so a separate collection bought us nothing but
// an extra join on every read.
//
// `_id: false` because the type is a singleton per promotion — no
// separate identity to track.
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
// Main promotion schema
// ─────────────────────────────────────────────────────────────────────
const promotionSchema = new Schema(
  {
    // Was a ref to PromotionType. Now an embedded document.
    promotionType: { type: promotionTypeSchema, required: true },

    // Values for the properties declared in `promotionType.properties`.
    // Still a Map keyed by `code` — the storefront evaluator reads from
    // here with `propertyValues.get(code)`.
    propertyValues: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },

    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // Customer-facing code.
    // - Present → code-gated.
    // - Absent  → auto-applies to any eligible cart.
    // `unique + sparse` so missing codes don't collide.
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

// Secondary: filter by calculation type (used by admin list views and
// reporting). The sub-doc field is addressable with dot notation.
promotionSchema.index({ "promotionType.calculationType": 1 });

export const Promotion =
  models.Promotion || model("Promotion", promotionSchema);

export default Promotion;

// Optional — handy type helpers for callers that want them.
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
