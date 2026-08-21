// models/PromotionType.ts
import { Schema, model, models } from 'mongoose';

const promotionTypeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // The underlying discount calculation type
    calculationType: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping', 'bundle_discount'],
      required: true,
    },
    // Properties that this promotion type requires
    properties: [
      {
        type: Schema.Types.ObjectId,
        ref: 'PromotionTypeProperty',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    icon: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PromotionType =
  models.PromotionType || model('PromotionType', promotionTypeSchema);

export default PromotionType;