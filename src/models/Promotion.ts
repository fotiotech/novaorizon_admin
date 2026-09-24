// models/Promotion.ts
import { Schema, model, models } from "mongoose";

const promotionSchema = new Schema(
  {
    promotionTypeId: {
      type: Schema.Types.ObjectId,
      ref: "PromotionType",
      required: true,
    },
    propertyValues: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // NEW: customer-facing code. When present, this promotion is
    // code-gated (customer must type it). When absent, it auto-applies
    // to any eligible cart.
    code: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
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

promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
promotionSchema.index({ code: 1 });

export const Promotion =
  models.Promotion || model("Promotion", promotionSchema);
export default Promotion;
