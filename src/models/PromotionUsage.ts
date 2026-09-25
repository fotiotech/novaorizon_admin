// models/PromotionUsage.ts
import { Schema, model, models } from "mongoose";

const promotionUsageSchema = new Schema(
  {
    promotionId: {
      type: Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
      index: true,
    },
    // Null for guest checkouts — per-customer limits only apply to
    // logged-in users.
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    discountAmount: { type: Number, required: true, min: 0 },
    code: { type: String, trim: true, uppercase: true },
  },
  { timestamps: true },
);

// A promotion can only be redeemed once per order.
promotionUsageSchema.index({ promotionId: 1, orderId: 1 }, { unique: true });

export const PromotionUsage =
  models.PromotionUsage || model("PromotionUsage", promotionUsageSchema);

export default PromotionUsage;
