// models/Promotion.ts
import { Schema, model, models } from 'mongoose';

const promotionSchema = new Schema(
  {
    // Reference to the promotion type
    promotionTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'PromotionType',
      required: true,
    },
    // Values for the properties defined in the promotion type
    propertyValues: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    // Basic info (can be inherited from type or overridden)
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    // Active period
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    // Customer eligibility
    customerEligibility: {
      allCustomers: { type: Boolean, default: true },
      customerGroupIds: [{ type: Schema.Types.ObjectId, ref: 'CustomerGroup' }],
      minOrderAmount: { type: Number, default: 0 },
    },
    // Usage limits
    usageLimits: {
      totalUses: { type: Number, default: null },
      perCustomer: { type: Number, default: null },
      perOrder: { type: Number, default: 1 },
    },
    // Stacking
    stackable: { type: Boolean, default: false },
    exclusiveWith: [{ type: Schema.Types.ObjectId, ref: 'Promotion' }],
    // Metadata
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const Promotion = models.Promotion || model('Promotion', promotionSchema);
export default Promotion;