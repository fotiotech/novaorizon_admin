import { models, model, Schema } from "mongoose";


const promotionSchema = new Schema(
  {
    // Basic info
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping', 'bundle_discount'],
      required: true,
    },
    // Active period
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // Status (overrides date range if needed)
    isActive: { type: Boolean, default: true },

    // Priority (lower number = higher priority when stacking)
    priority: { type: Number, default: 0 },

    // Customer eligibility
    customerEligibility: {
      allCustomers: { type: Boolean, default: true },
      customerGroupIds: [{ type: Schema.Types.ObjectId, ref: 'CustomerGroup' }],
      // minimum order value to qualify
      minOrderAmount: { type: Number, default: 0 },
    },

    // Usage limits
    usageLimits: {
      totalUses: { type: Number, default: null }, // null = unlimited
      perCustomer: { type: Number, default: null },
      perOrder: { type: Number, default: 1 }, // can this promo be applied multiple times in one order?
    },

    // Stacking rules
    stackable: { type: Boolean, default: false },
    exclusiveWith: [{ type: Schema.Types.ObjectId, ref: 'Promotion' }], // cannot combine with these

    // Dynamic rules – structure depends on `type`
    property: [{
      type: Schema.Types.ObjectId,
      ref: 'PromotionProperty'
    }],

    // Metadata
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const Promotion =
    models.Promotion || model('Promotion', promotionSchema);

export default Promotion;

