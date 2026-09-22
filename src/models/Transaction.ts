import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    amount: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      enum: ["income", "expense", "refund"],
      required: true,
    },
    description: { type: String, default: "" },
    paymentMethod: { type: String, default: "" },
    status: {
      type: String,
      enum: ["completed", "pending", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

TransactionSchema.index({ date: -1 });

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);

export default Transaction;
