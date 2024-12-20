import mongoose, { model, models } from "mongoose";

const OfferSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: {
    type: String,
    enum: ["percentage", "fixed", "bogo", "free_shipping", "bundle"],
    required: true,
  },
  discountValue: { type: Number, required: false }, // E.g., 20 for 20%
  conditions: {
    minPurchaseAmount: { type: Number },
    eligibleProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  isActive: { type: Boolean, default: true },
});

const Offer = models.Offer || model("Offer", OfferSchema);

export default Offer;
