import mongoose from "mongoose";

const DraftSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Compound index for fast lookups
DraftSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.models.Draft || mongoose.model("Draft", DraftSchema);
